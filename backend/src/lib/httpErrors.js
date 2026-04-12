export function sendProxyError(res, e) {
  const status = Number(e?.status) || 500;
  const rawBody = e?.body;

  // Try to forward JSON error bodies (FastAPI returns {"detail": ...})
  if (rawBody && typeof rawBody === "string") {
    try {
      const parsed = JSON.parse(rawBody);
      return res.status(status).json(parsed);
    } catch {
      // fall through
    }
  }

  return res.status(status).json({ error: String(e?.message || e), status });
}

export function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase().trim();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return undefined;
}

export function parseMaybeNumber(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function queryToSeriesBody(q) {
  // Keep in sync with frontend filters: provider/service/category/region + date window
  return {
    filters: {
      provider: q.provider,
      service: q.service,
      category: q.category,
      region: q.region,
    },
    // Reserved for future dataset slicing; ML currently ignores these for series_from_dataset
    start: q.start,
    end: q.end,
    granularity: q.granularity,
    include_anomalies: parseBool(q.include_anomalies),
    top_n_services: parseMaybeNumber(q.top_n_services),
  };
}
