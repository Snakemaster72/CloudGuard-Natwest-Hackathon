import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Scatter,
  ScatterChart,
} from 'recharts'
import { Button } from './components/ui/button'
import { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle} from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'
import { postJSON, ApiError } from './api'

type DatasetInfo = {
  dataset: {
    start: string
    end: string
    rows: number
    categories: string[]
    regions: string[]
    providers?: string[]
    services?: string[]
    // Optional: backend may expose mapping (future), but we can derive locally from canonical list if needed.
    servicesByProvider?: Record<string, string[]>
  }
}

type ForecastPoint = { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }

type AnomalyPoint = {
  ds: string
  y: number
  yhat: number
  yhat_lower: number
  yhat_upper: number
  explanation: string
}

type ExplainResponse = {
  title: string
  bullets: string[]
  actions?: string[]
  disclaimer?: string
}

type ChatResponse = {
  answer: string
  citations?: { path: string; value: any }[]
  followUps?: string[]
}

type SeriesPoint = { ds: string; y: number }

export default function App() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  // On first page load there can be a brief transient filter mismatch while defaults hydrate.
  // We suppress the very first 422 "no data" banner to avoid confusing the user.
  const [bootstrapping, setBootstrapping] = useState(true)

  const [dataset, setDataset] = useState<DatasetInfo | null>(null)
  const [category, setCategory] = useState<string>('')
  const [region, setRegion] = useState<string>('')
  const [provider, setProvider] = useState<string>('')
  const [service, setService] = useState<string>('')

  const [horizonDays, setHorizonDays] = useState(30)
  const [intervalWidth, setIntervalWidth] = useState(0.9)

  const [trafficMultiplier, setTrafficMultiplier] = useState(1.0)
  const [unitCostPct, setUnitCostPct] = useState(0.0)
  const [scenarioStart, setScenarioStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })

  const [forecast, setForecast] = useState<ForecastPoint[] | null>(null)
  const [baseline, setBaseline] = useState<any[] | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyPoint[] | null>(null)
  const [scenario, setScenario] = useState<{ baseline: ForecastPoint[]; scenario: ForecastPoint[]; delta: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [explainBusy, setExplainBusy] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [explainJson, setExplainJson] = useState<ExplainResponse | null>(null)
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null)

  const [actualSeries, setActualSeries] = useState<SeriesPoint[] | null>(null)

  const friendlyError = (e: any) => {
    // Prefer structured ApiError messages if available
    const status = (e as any)?.status
    const msg = String((e as any)?.message || e)

    if (status === 422) {
      // Common case: empty slice due to filters
      return `No data for the selected slice. Try a different Provider/Service/Region/Category. (${msg})`
    }
    // Strip noisy backend prefix like: "ML error 422: {...}"
    return msg.replace(/^ML error \d+:\s*/i, '')
  }

  // Canonical filter object
  const filters = useMemo(
    () => ({
      category: category || undefined,
      region: region || undefined,
      provider: provider || undefined,
      service: service || undefined,
    }),
    [category, region, provider, service]
  )

  const pickCategoryForService = (svc: string, categories: string[]) => {
    const serviceToCategory: Record<string, string> = {
      // AWS
      ec2: 'compute',
      eks: 'compute',
      lambda: 'compute',
      s3: 'storage',
      efs: 'storage',
      cloudfront: 'network',
      nat_gateway: 'network',
      vpc_endpoints: 'network',
      // GCP
      compute_engine: 'compute',
      gke: 'compute',
      cloud_run: 'compute',
      cloud_storage: 'storage',
      cloud_cdn: 'network',
      cloud_nat: 'network',
    }
    const implied = serviceToCategory[svc]
    if (implied && categories.includes(implied)) return implied
    return categories[0] || ''
  }

  // keep category consistent with selected service (prevents empty slices on load + on changes)
  useEffect(() => {
    const cats = dataset?.dataset?.categories ?? []
    if (!cats.length || !service) return
    const implied = pickCategoryForService(service, cats)
    if (implied && category && category !== implied) setCategory(implied)
  }, [service, dataset]) // intentionally not depending on category to avoid loops
  const availableProviders = useMemo(() => dataset?.dataset?.providers ?? [], [dataset])

  const servicesByProvider = useMemo(() => {
    // Prefer backend-provided mapping if present
    const fromApi = dataset?.dataset?.servicesByProvider
    if (fromApi && typeof fromApi === 'object') return fromApi

    // Fallback: explicit canonical mapping used by the generator.
    // (Do NOT derive from the current provider; this must be stable on first render.)
    return {
      aws: ['ec2', 'eks', 'lambda', 's3', 'efs', 'cloudfront', 'nat_gateway', 'vpc_endpoints'],
      gcp: ['compute_engine', 'gke', 'cloud_run', 'cloud_storage', 'cloud_cdn', 'cloud_nat'],
    }
  }, [dataset])

  const availableServices = useMemo(() => {
    if (!provider) return dataset?.dataset?.services ?? []
    return servicesByProvider[provider] ?? []
  }, [dataset, provider, servicesByProvider])

  // If provider changes and current service is not valid, auto-select the first valid service
  useEffect(() => {
    if (!provider) return
    if (!service) return
    if (!availableServices.length) return
    if (!availableServices.includes(service)) {
      setService(availableServices[0])
    }
  }, [provider, availableServices])

  useEffect(() => {
    fetch(`${apiBase}/api/dataset`)
      .then((r) => r.json())
      .then((d) => {
        setDataset(d)
        // default to first options if available
                const cats = d?.dataset?.categories ?? []
        const regs = d?.dataset?.regions ?? []
        const provs = d?.dataset?.providers ?? []
        const sbp = d?.dataset?.servicesByProvider || {
          aws: ['ec2', 'eks', 'lambda', 's3', 'efs', 'cloudfront', 'nat_gateway', 'vpc_endpoints'],
          gcp: ['compute_engine', 'gke', 'cloud_run', 'cloud_storage', 'cloud_cdn', 'cloud_nat'],
        }

        const p0 = provs?.[0] ?? ''
        // Compute all defaults synchronously first to avoid transient invalid combinations.
        const svc0 = (sbp?.[p0]?.[0] ?? d?.dataset?.services?.[0] ?? '') as string
        const cat0 = pickCategoryForService(svc0, cats)
        const reg0 = regs?.[0] ?? ''

        // Apply defaults
        setProvider(p0)
        setService(svc0)
        setCategory(cat0)
        setRegion(reg0)

        // Clear any prior error from before dataset load
        setError(null)

        // End bootstrap on next tick after defaults apply.
        setTimeout(() => setBootstrapping(false), 0)
      })
      .catch((e) => setError(friendlyError(e)))
  }, [apiBase])

  useEffect(() => {
    // Clear when filters change
    setActualSeries(null)
    if (!bootstrapping) setError(null)

    // On first load, wait until dataset + defaults are present.
    if (!dataset) return
    if (!(provider && service && region && category)) return

    postJSON<{ series: SeriesPoint[] }>('/api/series_from_dataset', { filters })
      .then((d) => setActualSeries(d.series))
      .catch((e) => {
        // If the first request during bootstrap hits an empty slice, don't show a scary banner.
        const status = (e as any)?.status
        if (bootstrapping && status === 422) return
        setError(friendlyError(e))
      })
  }, [filters, dataset, provider, service, region, category, bootstrapping])

  const forecastChartData = useMemo(() => {
    if (!forecast) return []

    const actualByDate = new Map<string, number>()
    ;(actualSeries ?? []).forEach((p) => actualByDate.set(p.ds, p.y))

    const anomalyByDate = new Map<string, AnomalyPoint>()
    ;(anomalies ?? []).forEach((a) => anomalyByDate.set(a.ds, a))

    const scenarioByDate = new Map((scenario?.scenario ?? []).map((p: any) => [p.ds, p.yhat]))
    const scenarioUpperByDate = new Map((scenario?.scenario ?? []).map((p: any) => [p.ds, p.yhat_upper]))
    const scenarioLowerByDate = new Map((scenario?.scenario ?? []).map((p: any) => [p.ds, p.yhat_lower]))

    return forecast.map((f) => ({
      ds: f.ds,
      yhat: f.yhat,
      lower: f.yhat_lower,
      upper: f.yhat_upper,
      actual: actualByDate.get(f.ds) ?? null,
      anomalyY: anomalyByDate.get(f.ds)?.y ?? null,
      anomalyLabel: anomalyByDate.get(f.ds)?.explanation ?? null,
      scenarioYhat: scenarioByDate.get(f.ds) ?? null,
      scenarioUpper: scenarioUpperByDate.get(f.ds) ?? null,
      scenarioLower: scenarioLowerByDate.get(f.ds) ?? null,
    }))
  }, [forecast, actualSeries, anomalies, scenario])

  const latestActual = useMemo(() => {
    const last = actualSeries?.[actualSeries.length - 1]
    return last?.y ?? null
  }, [actualSeries])

  const activeSliceLabel = useMemo(() => {
    const parts = [provider, service, region, category].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'All spend'
  }, [provider, service, region, category])

  const factsForLLM = useMemo(() => {
    const lastForecast = forecast?.[forecast.length - 1]
    const anCount = anomalies?.length ?? 0
    const latestAn = anCount ? anomalies?.[anCount - 1] : null

    return {
      slice: {
        category: category || null,
        region: region || null,
        provider: provider || null,
        service: service || null,
        label: activeSliceLabel,
      },
      datasetWindow: {
        start: dataset?.dataset?.start,
        end: dataset?.dataset?.end,
      },
      forecastSummary: lastForecast
        ? {
            horizonDays,
            intervalWidth,
            endDate: lastForecast.ds,
            endYhat: lastForecast.yhat,
            endLower: lastForecast.yhat_lower,
            endUpper: lastForecast.yhat_upper,
          }
        : null,
      anomaliesSummary: {
        count: anCount,
        latest: latestAn
          ? {
              ds: latestAn.ds,
              actual: latestAn.y,
              expected: latestAn.yhat,
              lower: latestAn.yhat_lower,
              upper: latestAn.yhat_upper,
              label: latestAn.explanation,
            }
          : null,
      },
      scenarioSummary: scenario?.delta
        ? {
            start: scenarioStart,
            workloadMultiplier: trafficMultiplier,
            unitRateDelta: unitCostPct,
            cumulativeDelta: scenario.delta.cumulative?.deltaTotal,
            endOfHorizonDeltaPerDay: scenario.delta.endOfHorizon?.deltaYhat,
          }
        : null,
    }
  }, [
    category,
    region,
    provider,
    service,
    activeSliceLabel,
    dataset,
    forecast,
    horizonDays,
    intervalWidth,
    anomalies,
    scenario,
    scenarioStart,
    trafficMultiplier,
    unitCostPct,
  ])

  async function runAll() {
    setBusy(true)
    setError(null)
    try {
      const [fcResp, blResp, anResp] = await Promise.all([
        fetch(`${apiBase}/api/forecast_from_dataset`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ horizonDays, intervalWidth, filters }),
        }),
        fetch(`${apiBase}/api/baseline_from_dataset`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ horizonDays, windowDays: 14, filters }),
        }),
        fetch(`${apiBase}/api/anomalies_from_dataset`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ intervalWidth, filters }),
        }),
      ])

      // Convert non-2xx into the same ApiError shape used by postJSON()
      const toApiError = async (r: Response) => {
        if (r.ok) return null
        let payload: any = undefined
        try {
          payload = await r.json()
        } catch {
          // ignore
        }
        const msg = payload?.detail || payload?.error || payload?.message || r.statusText
        return new ApiError(r.status, msg, payload)
      }

      const fcErr = await toApiError(fcResp)
      if (fcErr) throw fcErr
      const blErr = await toApiError(blResp)
      if (blErr) throw blErr
      const anErr = await toApiError(anResp)
      if (anErr) throw anErr

      const fc = await fcResp.json()
      const bl = await blResp.json()
      const an = await anResp.json()

       setForecast(fc.forecast)
       setBaseline(bl.forecast)
       setAnomalies(an.anomalies)
       setScenario(null)
     } catch (e: any) {
      setError(friendlyError(e))
     } finally {
       setBusy(false)
     }
   }

  async function runScenario() {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(`${apiBase}/api/scenario_from_dataset`, {
         method: 'POST',
         headers: { 'content-type': 'application/json' },
         body: JSON.stringify({
           horizonDays,
           intervalWidth,
           filters,
           effects: [
             { type: 'multiplier', start: scenarioStart, value: trafficMultiplier },
             { type: 'unit_cost_pct', start: scenarioStart, value: unitCostPct },
           ],
         }),
      })

      if (!r.ok) {
        let payload: any = undefined
        try {
          payload = await r.json()
        } catch {
          // ignore
        }
        const msg = payload?.detail || payload?.error || payload?.message || r.statusText
        throw new ApiError(r.status, msg, payload)
      }

      const resp = await r.json()
      setScenario(resp)
     } catch (e: any) {
      setError(friendlyError(e))
     } finally {
       setBusy(false)
     }
   }

  async function runExplain(task: 'forecast_explanation' | 'anomaly_explanation' | 'scenario_interpretation') {
    setExplainBusy(true)
    setExplainError(null)
    setExplainJson(null)
    try {
      const resp = await fetch(`${apiBase}/api/explain`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task, payload: { facts: factsForLLM } }),
      }).then((r) => r.json())

      if (resp?.error) throw new Error(resp.error)
      setExplainJson(resp as ExplainResponse)
    } catch (e: any) {
      setExplainError(String(e?.message || e))
    } finally {
      setExplainBusy(false)
    }
  }

  async function runChat(question?: string) {
    const q = (question ?? chatQuestion).trim()
    if (!q) return

    setChatBusy(true)
    setChatError(null)
    setChatResponse(null)

    try {
      const r = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, facts: factsForLLM }),
      })

      // Match our other calls: surface backend errors instead of silently rendering nothing.
      if (!r.ok) {
        let msg = r.statusText
        try {
          const payload = await r.json()
          msg = String(payload?.error || payload?.detail || payload?.message || JSON.stringify(payload))
        } catch {
          msg = (await r.text().catch(() => '')) || msg
        }
        throw new ApiError(r.status, msg)
      }

      const raw = await r.json()
      if (raw?.error) throw new Error(raw.error)

      // Be tolerant to backend variants to avoid blank UI regressions:
      // - {answer, followUps, citations}
      // - {response: {answer, ...}}
      // - "plain string"
      const normalized: ChatResponse =
        typeof raw === 'string'
          ? { answer: raw }
          : (raw?.response ?? raw)

      if (!normalized?.answer) {
        throw new Error('Chat response missing answer')
      }

      setChatResponse(normalized)
    } catch (e: any) {
      setChatError(friendlyError(e))
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800/60 bg-slate-950/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold tracking-tight">CloudGuard</div>
            <div className="text-sm text-slate-400">Predictive cloud spend forecasting & anomaly detection</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={runAll} disabled={busy}>
              {busy ? 'Working…' : 'Run forecast'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-4 px-6 py-6">
        {error ? (
          <div className="col-span-12 rounded-lg border border-red-900/40 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Slice spend by category/region/provider/service (dataset-backed).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Cost category</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {(dataset?.dataset?.categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {(dataset?.dataset?.regions ?? []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                {availableProviders.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Service</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {availableServices.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-9">
          <CardHeader>
            <CardTitle>Cloud spend forecast</CardTitle>
            <CardDescription>Forecasted daily cloud spend with uncertainty band. Scenario overlay appears in red.</CardDescription>
          </CardHeader>
          <CardContent>
            {!forecast ? (
              <div className="text-sm text-slate-400">Click “Run forecast” to generate predictions.</div>
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="ds" hide />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="upper" stroke="#22c55e" fill="#22c55e" fillOpacity={0.10} name="Upper" />
                    <Area type="monotone" dataKey="lower" stroke="#22c55e" fill="#22c55e" fillOpacity={0.10} name="Lower" />
                    <Line type="monotone" dataKey="yhat" stroke="#34d399" dot={false} name="Forecast" />
                    <Line type="monotone" dataKey="actual" stroke="#60a5fa" dot={false} name="Actual" />
                    <Scatter dataKey="anomalyY" fill="#f97316" name="Anomaly" />
                    {scenario ? (
                      <>
                        <Line type="monotone" dataKey="scenarioYhat" stroke="#ef4444" dot={false} name="Scenario" />
                        <Area type="monotone" dataKey="scenarioUpper" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} name="Scenario upper" />
                        <Area type="monotone" dataKey="scenarioLower" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} name="Scenario lower" />
                      </>
                    ) : null}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-3">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Forecast horizon and confidence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Horizon (days)</Label>
              <Input
                type="number"
                min={7}
                max={90}
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Interval width</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                value={intervalWidth}
                onChange={(e) => setIntervalWidth(Number(e.target.value))}
              >
                <option value={0.8}>0.80</option>
                <option value={0.9}>0.90</option>
                <option value={0.95}>0.95</option>
              </select>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
              <div className="text-slate-400">Latest actual</div>
              <div className="text-lg font-semibold">{latestActual?.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle>Scenario simulation</CardTitle>
            <CardDescription>Simulate workload changes and unit-rate optimizations from a start date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={scenarioStart} onChange={(e) => setScenarioStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Workload multiplier (e.g. 1.2 = +20%)</Label>
                <Input
                  type="number"
                  step={0.05}
                  min={0.5}
                  max={2.0}
                  value={trafficMultiplier}
                  onChange={(e) => setTrafficMultiplier(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit-rate delta (e.g. -0.08 = 8% savings)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={-0.3}
                  max={0.3}
                  value={unitCostPct}
                  onChange={(e) => setUnitCostPct(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={runScenario} disabled={!forecast || busy}>
                  Run scenario
                </Button>
              </div>
            </div>

            {scenario?.delta ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Cumulative delta (sum daily)</div>
                  <div className="text-lg font-semibold">{scenario.delta.cumulative.deltaTotal.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">End-of-horizon delta / day</div>
                  <div className="text-lg font-semibold">{scenario.delta.endOfHorizon.deltaYhat.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Run scenario to see the impact overlay and deltas.</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle>Baseline & anomalies</CardTitle>
            <CardDescription>Baseline run-rate (moving average). Anomalies are days outside the expected band.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(baseline ?? []).slice(0, 30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="ds" hide />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="yhat" stroke="#a3a3a3" dot={false} name="Baseline" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {!anomalies ? (
              <div className="text-sm text-slate-400">Run forecast to see anomalies.</div>
            ) : anomalies.length === 0 ? (
              <div className="text-sm text-slate-300">No anomalies detected.</div>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
                {anomalies.slice(0, 5).map((a: any, i: number) => (
                  <li key={i}>
                    <span className="text-slate-300">{a.ds}</span>: actual <span className="font-medium">{a.y}</span> vs upper{' '}
                    <span className="font-medium">{a.yhat_upper}</span> — <span className="text-slate-400">{a.explanation}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Cloud AI copilot</CardTitle>
            <CardDescription>LLM explanations grounded only in the selected slice + current outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                Active slice: <span className="text-slate-200">{activeSliceLabel}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => runExplain('forecast_explanation')}
                disabled={!forecast || explainBusy}
              >
                Explain forecast
              </Button>
              <Button
                variant="outline"
                onClick={() => runExplain('anomaly_explanation')}
                disabled={!anomalies || (anomalies?.length ?? 0) === 0 || explainBusy}
              >
                Explain latest anomaly
              </Button>
              <Button
                variant="outline"
                onClick={() => runExplain('scenario_interpretation')}
                disabled={!scenario || explainBusy}
              >
                Explain scenario impact
              </Button>
            </div>

            {explainError ? (
              <div className="rounded-lg border border-red-900/40 bg-red-950/40 p-3 text-sm text-red-200">
                {explainError}
              </div>
            ) : null}

            {explainJson ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-sm font-semibold text-slate-100">{explainJson.title}</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {(explainJson.bullets ?? []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Recommended actions</div>
                  {explainJson.actions?.length ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                      {explainJson.actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-2 text-sm text-slate-300">No actions suggested.</div>
                  )}
                  {explainJson.disclaimer ? (
                    <div className="mt-2 text-xs text-slate-500">{explainJson.disclaimer}</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Click an explain button to generate a grounded explanation.</div>
            )}

            <details className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <summary className="cursor-pointer text-xs text-slate-300">Facts sent to LLM (debug)</summary>
              <div className="mt-2">
                <Textarea value={JSON.stringify(factsForLLM, null, 2)} readOnly className="font-mono text-xs" />
              </div>
            </details>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="text-xs text-slate-400">Ask a question</div>
              <div className="mt-2 flex flex-col gap-2 md:flex-row">
                <Input
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="e.g. What likely drove the latest spike, and what should we check first?"
                />
                <Button onClick={() => runChat()} disabled={chatBusy}>
                  {chatBusy ? 'Asking…' : 'Ask'}
                </Button>
              </div>

              {chatError ? (
                <div className="mt-2 rounded-md border border-red-900/40 bg-red-950/40 p-2 text-sm text-red-200">
                  {chatError}
                </div>
              ) : null}

              {chatResponse ? (
                <div className="mt-3 space-y-3">
                  <div className="text-sm text-slate-200">{chatResponse.answer}</div>

                  {chatResponse.followUps?.length ? (
                    <div>
                      <div className="text-xs text-slate-400">Follow-ups</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {chatResponse.followUps.slice(0, 4).map((f, i) => (
                          <button
                            key={i}
                            className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
                            onClick={() => {
                              setChatQuestion(f)
                              runChat(f)
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <details className="rounded-md border border-slate-800 bg-slate-900/20 p-2">
                    <summary className="cursor-pointer text-xs text-slate-400">Citations (debug)</summary>
                    <Textarea
                      value={JSON.stringify(chatResponse.citations ?? [], null, 2)}
                      readOnly
                      className="mt-2 font-mono text-xs"
                    />
                  </details>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-slate-500">
        CloudGuard MVP (local). Next: service/provider breakdown, explain panel, budgets & alerts.
      </footer>
    </div>
  )
}
