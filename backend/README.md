# Backend (Node API)

- Proxies CloudGuard analytics requests to `ml-service`
- Uses Gemini for cloud-aware `/api/explain` and `/api/chat`

Env:
- `ML_SERVICE_URL` (default `http://localhost:8001`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default `gemini-1.5-flash`)
