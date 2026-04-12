# CloudGuard architecture

```text
┌───────────────────────────┐
│           User            │
└─────────────┬─────────────┘
              │  HTTP
              ▼
┌───────────────────────────┐
│ Frontend (React + Vite)   │  :5173
│ - filter-safe UI          │
│ - charts + scenario inputs│
│ - copilot panel           │
└─────────────┬─────────────┘
              │ /api/*
              ▼
┌───────────────────────────┐
│ Backend (Node + Express)  │  :8000
│ - API gateway              │
│ - proxies ML errors as-is  │
│ - Gemini explain/chat      │
└───────┬───────────┬───────┘
        │           │
        │           │ Gemini API (optional)
        │           ▼
        │     ┌──────────────┐
        │     │ Google Gemini │
        │     └──────────────┘
        │
        │ /ml/*
        ▼
┌───────────────────────────┐
│ ML service (FastAPI)      │  :8001
│ - loads synthetic dataset │
│ - forecasting (Prophet)   │
│ - baseline + anomalies    │
│ - scenario simulation     │
└─────────────┬─────────────┘
              │
              ▼
        data/synthetic_cloud_costs.csv
```

Notes:
- The synthetic dataset is the system of record for demo reproducibility.
- The UI prevents invalid Provider/Service combinations, so requests do not hit empty slices.
- If Gemini is not configured (`GEMINI_API_KEY` missing), the backend returns deterministic fallback explanations.
