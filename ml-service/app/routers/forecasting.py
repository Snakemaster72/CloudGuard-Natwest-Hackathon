from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import pandas as pd

# Dataset source of truth
from app.services.dataset import load_dataset, to_daily_series, validate_daily_series

# Allow importing the original repo's /src package when running from ml-service/
import sys
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Reuse existing core logic from the original repo
# (keeps hackathon velocity high)
from src.forecasting import train_predict, detect_anomalies

router = APIRouter(tags=["forecasting"])


class Point(BaseModel):
    ds: str
    y: float


class Series(BaseModel):
    seriesId: Optional[str] = None
    frequency: Literal["D"] = "D"
    currency: Optional[str] = "USD"
    data: List[Point]


class ForecastRequest(BaseModel):
    series: Series
    horizonDays: int = Field(ge=0, le=365, default=30)
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)


@router.post("/forecast")
def forecast(req: ForecastRequest):
    df = pd.DataFrame([p.model_dump() for p in req.series.data])
    df["ds"] = pd.to_datetime(df["ds"])

    model, fcst = train_predict(df, periods=req.horizonDays, interval_width=req.intervalWidth)

    out = fcst[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    out["ds"] = out["ds"].dt.strftime("%Y-%m-%d")

    return {
        "forecast": out.to_dict(orient="records"),
        "meta": {
            "horizonDays": req.horizonDays,
            "intervalWidth": req.intervalWidth,
        },
    }


class BaselineRequest(BaseModel):
    series: Series
    horizonDays: int = Field(ge=0, le=365, default=30)
    method: Literal["moving_average"] = "moving_average"
    windowDays: int = Field(ge=2, le=60, default=14)


@router.post("/baseline")
def baseline(req: BaselineRequest):
    df = pd.DataFrame([p.model_dump() for p in req.series.data])
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.sort_values("ds")

    y = df["y"].astype(float)
    mu = float(y.tail(req.windowDays).mean())
    sigma = float(y.tail(req.windowDays).std(ddof=1) if req.windowDays > 2 else y.std(ddof=1))

    last_date = df["ds"].max()
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=req.horizonDays, freq="D")

    z = 1.645  # ~90% two-sided
    rows = []
    for d in future_dates:
        rows.append(
            {
                "ds": d.strftime("%Y-%m-%d"),
                "yhat": mu,
                "yhat_lower": mu - z * sigma,
                "yhat_upper": mu + z * sigma,
            }
        )

    return {"forecast": rows, "meta": {"method": req.method, "windowDays": req.windowDays}}


class AnomaliesRequest(BaseModel):
    series: Series
    horizonDays: int = Field(ge=0, le=0, default=0)  # historical only
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)


@router.post("/anomalies")
def anomalies(req: AnomaliesRequest):
    df = pd.DataFrame([p.model_dump() for p in req.series.data])
    df["ds"] = pd.to_datetime(df["ds"])

    _, fcst = train_predict(df, periods=0, interval_width=req.intervalWidth)
    an = detect_anomalies(df, fcst)

    an = an[["ds", "y", "yhat", "yhat_lower", "yhat_upper", "explanation"]].copy()
    an["ds"] = pd.to_datetime(an["ds"]).dt.strftime("%Y-%m-%d")

    return {"anomalies": an.to_dict(orient="records")}


class ScenarioEffect(BaseModel):
    # v1: only multiplicative effects
    type: Literal["multiplier", "unit_cost_pct"]
    start: str  # YYYY-MM-DD
    value: float


class ScenarioRequest(BaseModel):
    series: Series
    horizonDays: int = Field(ge=1, le=365, default=30)
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)
    effects: List[ScenarioEffect] = Field(default_factory=list)


@router.post("/scenario")
def scenario(req: ScenarioRequest):
    df = pd.DataFrame([p.model_dump() for p in req.series.data])
    df["ds"] = pd.to_datetime(df["ds"])

    _, baseline_fcst = train_predict(df, periods=req.horizonDays, interval_width=req.intervalWidth)

    # Only future dates get scenario effects
    max_date = df["ds"].max()
    scenario_fcst = baseline_fcst.copy()

    scenario_fcst["mult"] = 1.0
    for eff in req.effects:
        start = pd.to_datetime(eff.start)
        mask = (scenario_fcst["ds"] > max_date) & (scenario_fcst["ds"] >= start)
        if eff.type == "multiplier":
            scenario_fcst.loc[mask, "mult"] *= float(eff.value)
        elif eff.type == "unit_cost_pct":
            scenario_fcst.loc[mask, "mult"] *= (1.0 + float(eff.value))

    for col in ["yhat", "yhat_lower", "yhat_upper"]:
        scenario_fcst.loc[scenario_fcst["ds"] > max_date, col] *= scenario_fcst.loc[
            scenario_fcst["ds"] > max_date, "mult"
        ]

    # Format outputs
    base_out = baseline_fcst[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    scen_out = scenario_fcst[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    base_out["ds"] = base_out["ds"].dt.strftime("%Y-%m-%d")
    scen_out["ds"] = scen_out["ds"].dt.strftime("%Y-%m-%d")

    # Delta summary over future horizon
    base_future = baseline_fcst[baseline_fcst["ds"] > max_date].reset_index(drop=True)
    scen_future = scenario_fcst[scenario_fcst["ds"] > max_date].reset_index(drop=True)
    delta_daily = (
        pd.DataFrame(
            {
                "ds": scen_future["ds"].dt.strftime("%Y-%m-%d"),
                "deltaYhat": (scen_future["yhat"] - base_future["yhat"]).astype(float),
            }
        )
        .to_dict(orient="records")
    )

    delta_total = float((scen_future["yhat"] - base_future["yhat"]).sum())

    return {
        "baseline": base_out.to_dict(orient="records"),
        "scenario": scen_out.to_dict(orient="records"),
        "delta": {
            "daily": delta_daily,
            "cumulative": {"deltaTotal": delta_total},
            "endOfHorizon": {
                "ds": scen_future["ds"].iloc[-1].strftime("%Y-%m-%d"),
                "deltaYhat": float(scen_future["yhat"].iloc[-1] - base_future["yhat"].iloc[-1]),
            },
        },
        "meta": {"intervalWidth": req.intervalWidth, "horizonDays": req.horizonDays},
    }


@router.get("/dataset")
def dataset_info():
    df, meta = load_dataset()

    providers = (
        sorted(df["provider"].dropna().unique().tolist()) if "provider" in df.columns else []
    )
    services = (
        sorted(df["service"].dropna().unique().tolist()) if "service" in df.columns else []
    )

    services_by_provider = {}
    if providers and "service" in df.columns and "provider" in df.columns:
        for p in providers:
            svcs = (
                df.loc[df["provider"] == p, "service"]
                .dropna()
                .unique()
                .tolist()
            )
            services_by_provider[p] = sorted([str(s) for s in svcs])

    return {
        "dataset": {
            "path": str(meta.path),
            "rows": meta.rows,
            "start": meta.start,
            "end": meta.end,
            "columns": list(df.columns),
            "categories": sorted(df["category"].dropna().unique().tolist()) if "category" in df.columns else [],
            "regions": sorted(df["region"].dropna().unique().tolist()) if "region" in df.columns else [],
            "providers": providers,
            "services": services,
            "servicesByProvider": services_by_provider,
        }
    }


class DatasetFilter(BaseModel):
    category: Optional[str] = None
    region: Optional[str] = None
    provider: Optional[str] = None
    service: Optional[str] = None


class ForecastFromDatasetRequest(BaseModel):
    horizonDays: int = Field(ge=0, le=365, default=30)
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)
    filters: DatasetFilter = Field(default_factory=DatasetFilter)


class SeriesFromDatasetRequest(BaseModel):
    filters: DatasetFilter = Field(default_factory=DatasetFilter)


def _filter_context(f: DatasetFilter) -> str:
    parts = []
    if f.provider:
        parts.append(f"provider={f.provider}")
    if f.service:
        parts.append(f"service={f.service}")
    if f.region:
        parts.append(f"region={f.region}")
    if f.category:
        parts.append(f"category={f.category}")
    return ",".join(parts) if parts else "(no filters)"


@router.post("/series_from_dataset")
def series_from_dataset(req: SeriesFromDatasetRequest):
    df, _ = load_dataset()
    try:
        daily = validate_daily_series(
            to_daily_series(
                df,
                category=req.filters.category,
                region=req.filters.region,
                provider=req.filters.provider,
                service=req.filters.service,
            ),
            context=_filter_context(req.filters),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    out = daily[["ds", "y"]].copy()
    out["ds"] = pd.to_datetime(out["ds"]).dt.strftime("%Y-%m-%d")
    out["y"] = out["y"].astype(float)
    return {"series": out.to_dict(orient="records")}


@router.post("/forecast_from_dataset")
def forecast_from_dataset(req: ForecastFromDatasetRequest):
    df, _ = load_dataset()
    try:
        daily = validate_daily_series(
            to_daily_series(
                df,
                category=req.filters.category,
                region=req.filters.region,
                provider=req.filters.provider,
                service=req.filters.service,
            ),
            context=_filter_context(req.filters),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    _, fcst = train_predict(daily, periods=req.horizonDays, interval_width=req.intervalWidth)
    out = fcst[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    out["ds"] = out["ds"].dt.strftime("%Y-%m-%d")
    return {"forecast": out.to_dict(orient="records"), "meta": {"horizonDays": req.horizonDays, "intervalWidth": req.intervalWidth}}


class BaselineFromDatasetRequest(BaseModel):
    horizonDays: int = Field(ge=0, le=365, default=30)
    windowDays: int = Field(ge=2, le=60, default=14)
    filters: DatasetFilter = Field(default_factory=DatasetFilter)


@router.post("/baseline_from_dataset")
def baseline_from_dataset(req: BaselineFromDatasetRequest):
    df, _ = load_dataset()
    try:
        daily = validate_daily_series(
            to_daily_series(
                df,
                category=req.filters.category,
                region=req.filters.region,
                provider=req.filters.provider,
                service=req.filters.service,
            ),
            context=_filter_context(req.filters),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    y = daily["y"].astype(float)
    mu = float(y.tail(req.windowDays).mean())
    sigma = float(y.tail(req.windowDays).std(ddof=1) if req.windowDays > 2 else y.std(ddof=1))

    last_date = pd.to_datetime(daily["ds"]).max()
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=req.horizonDays, freq="D")

    z = 1.645
    rows = [
        {"ds": d.strftime("%Y-%m-%d"), "yhat": mu, "yhat_lower": mu - z * sigma, "yhat_upper": mu + z * sigma}
        for d in future_dates
    ]
    return {"forecast": rows, "meta": {"method": "moving_average", "windowDays": req.windowDays}}


class AnomaliesFromDatasetRequest(BaseModel):
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)
    filters: DatasetFilter = Field(default_factory=DatasetFilter)


@router.post("/anomalies_from_dataset")
def anomalies_from_dataset(req: AnomaliesFromDatasetRequest):
    df, _ = load_dataset()
    try:
        daily = validate_daily_series(
            to_daily_series(
                df,
                category=req.filters.category,
                region=req.filters.region,
                provider=req.filters.provider,
                service=req.filters.service,
            ),
            context=_filter_context(req.filters),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    _, fcst = train_predict(daily, periods=0, interval_width=req.intervalWidth)
    an = detect_anomalies(daily, fcst)

    an = an[["ds", "y", "yhat", "yhat_lower", "yhat_upper", "explanation"]].copy()
    an["ds"] = pd.to_datetime(an["ds"]).dt.strftime("%Y-%m-%d")
    return {"anomalies": an.to_dict(orient="records")}


class ScenarioFromDatasetRequest(BaseModel):
    horizonDays: int = Field(ge=1, le=365, default=30)
    intervalWidth: float = Field(ge=0.5, le=0.99, default=0.9)
    filters: DatasetFilter = Field(default_factory=DatasetFilter)
    effects: List[ScenarioEffect] = Field(default_factory=list)


@router.post("/scenario_from_dataset")
def scenario_from_dataset(req: ScenarioFromDatasetRequest):
    df, _ = load_dataset()
    daily = validate_daily_series(
        to_daily_series(
            df,
            category=req.filters.category,
            region=req.filters.region,
            provider=req.filters.provider,
            service=req.filters.service,
        )
    )

    # Reuse existing scenario logic by adapting to the same function body
    fake_series = Series(frequency="D", currency="USD", data=[Point(ds=d.strftime("%Y-%m-%d"), y=float(v)) for d, v in zip(daily["ds"], daily["y"])])
    return scenario(ScenarioRequest(series=fake_series, horizonDays=req.horizonDays, intervalWidth=req.intervalWidth, effects=req.effects))
