export type SeriesPoint = { ds: string; y: number }

export type SeriesPayload = {
  frequency: 'D'
  currency?: string
  data: SeriesPoint[]
}

export type ForecastPoint = {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}
