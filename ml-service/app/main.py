from fastapi import FastAPI
from app.routers import forecasting

app = FastAPI(title="CloudGuard ML Service", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(forecasting.router, prefix="/ml")
