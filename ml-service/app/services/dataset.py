from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"
DEFAULT_DATASET_PATH = DATA_DIR / "synthetic_cloud_costs.csv"


@dataclass
class DatasetMeta:
    path: Path
    rows: int
    start: str
    end: str


def load_dataset(path: Optional[str] = None) -> tuple[pd.DataFrame, DatasetMeta]:
    """Load the canonical dataset (single source of truth).

    Expected schema:
    - date: YYYY-MM-DD
    - value: float
    Optional:
    - category, region, is_anomaly

    Returns raw (non-aggregated) rows.
    """

    p = Path(path) if path else DEFAULT_DATASET_PATH
    if not p.exists() or p.stat().st_size == 0:
        raise FileNotFoundError(f"Dataset not found or empty: {p}")

    df = pd.read_csv(p)
    if "date" not in df.columns or "value" not in df.columns:
        raise ValueError("Dataset must include 'date' and 'value' columns")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["date", "value"])

    df = df.sort_values("date")

    meta = DatasetMeta(
        path=p,
        rows=int(len(df)),
        start=df["date"].min().strftime("%Y-%m-%d"),
        end=df["date"].max().strftime("%Y-%m-%d"),
    )
    return df, meta


def to_daily_series(
    df: pd.DataFrame,
    category: Optional[str] = None,
    region: Optional[str] = None,
    provider: Optional[str] = None,
    service: Optional[str] = None,
) -> pd.DataFrame:
    """Aggregate raw dataset rows into a single daily time-series suitable for forecasting."""

    out = df.copy()
    if category and "category" in out.columns:
        out = out[out["category"] == category]
    if region and "region" in out.columns:
        out = out[out["region"] == region]
    if provider and "provider" in out.columns:
        out = out[out["provider"] == provider]
    if service and "service" in out.columns:
        out = out[out["service"] == service]

    daily = out.groupby("date", as_index=False)["value"].sum()
    daily = daily.sort_values("date")
    return daily.rename(columns={"date": "ds", "value": "y"})


def validate_daily_series(
    daily: pd.DataFrame,
    *,
    allow_empty: bool = False,
    context: Optional[str] = None,
) -> pd.DataFrame:
    """Handle missing dates and ensure monotonic daily frequency.

    If allow_empty=True and the filtered series is empty, returns an empty dataframe with columns [ds, y].
    """

    if daily.empty:
        if allow_empty:
            return pd.DataFrame({"ds": pd.Series(dtype="datetime64[ns]"), "y": pd.Series(dtype="float")})
        msg = "No data after filtering"
        if context:
            msg = f"{msg}: {context}"
        raise ValueError(msg)

    daily = daily.copy()
    daily["ds"] = pd.to_datetime(daily["ds"], errors="coerce")
    daily["y"] = pd.to_numeric(daily["y"], errors="coerce")
    daily = daily.dropna(subset=["ds", "y"]).sort_values("ds")

    # Reindex to daily and forward-fill short gaps (realistic for billing)
    idx = pd.date_range(daily["ds"].min(), daily["ds"].max(), freq="D")
    daily = daily.set_index("ds").reindex(idx)
    daily.index.name = "ds"

    # Fill missing with linear interpolation (keeps series smooth)
    daily["y"] = daily["y"].interpolate(method="time").ffill().bfill()

    return daily.reset_index()
