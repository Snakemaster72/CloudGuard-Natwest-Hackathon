# ML Service (FastAPI)

Endpoints:
- `GET /health`
- `GET /ml/dataset` (metadata + available filters)

Dataset-backed analytics (CloudGuard MVP):
- `POST /ml/forecast_from_dataset`
- `POST /ml/baseline_from_dataset`
- `POST /ml/anomalies_from_dataset`
- `POST /ml/scenario_from_dataset`

This service is intentionally JSON-only. No LLM keys here.
