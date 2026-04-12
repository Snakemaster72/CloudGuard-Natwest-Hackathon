export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

type ApiErrorPayload = { detail?: string; error?: string; message?: string }

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload
  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function readErrorMessage(r: Response): Promise<{ message: string; payload?: ApiErrorPayload }> {
  const contentType = r.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      const payload = (await r.json()) as ApiErrorPayload
      const message = payload.detail || payload.error || payload.message || JSON.stringify(payload)
      return { message, payload }
    }
  } catch {
    // ignore
  }

  const txt = await r.text().catch(() => '')
  // Some backend errors are like: `ML error 422: {"detail":"..."}`
  try {
    const start = txt.indexOf('{')
    const end = txt.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const payload = JSON.parse(txt.slice(start, end + 1)) as ApiErrorPayload
      const message = payload.detail || payload.error || payload.message || txt
      return { message, payload }
    }
  } catch {
    // ignore
  }

  return { message: txt || r.statusText }
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const { message, payload } = await readErrorMessage(r)
    throw new ApiError(r.status, message, payload)
  }
  return r.json() as Promise<T>
}

export async function getJSON<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query || {})) {
    if (v === undefined) continue
    qs.set(k, String(v))
  }
  const url = `${API_BASE}${path}${qs.toString() ? `?${qs.toString()}` : ''}`
  const r = await fetch(url)
  if (!r.ok) {
    const { message, payload } = await readErrorMessage(r)
    throw new ApiError(r.status, message, payload)
  }
  return r.json() as Promise<T>
}
