# CloudGuard → Predictive Cloud Spend Intelligence (Upgraded)

This repo includes a production-style, hackathon-ready architecture:

- `frontend/` – React + TypeScript dashboard (spend forecast bands, anomalies, scenarios)
- `backend/` – Node.js API gateway (calls ML service + Gemini for cloud-aware explanations/chat)
- `ml-service/` – Python FastAPI microservice (Prophet forecasts, baselines, anomalies, scenarios)

## Quick start (local, no Docker)

1. Create an env file:
   - Copy `.env.example` → `.env`
   - (Optional) set `GEMINI_API_KEY` to enable Copilot explanations

2. Run the services locally:
   - Follow `DEV_LOCAL.md`

3. Open:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000/health
   - ML service: http://localhost:8001/health

## Notes

- Docker files were intentionally removed for a local-only submission path.
- See service-specific READMEs for additional details.
