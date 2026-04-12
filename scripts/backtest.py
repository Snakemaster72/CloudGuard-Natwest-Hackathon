"""Simple, reproducible backtest for CloudGuard synthetic dataset.

This script is intentionally lightweight and dependency-minimal (pandas only).

It evaluates:
- Baseline: rolling moving-average (1-step ahead)
- Forecast(model): Prophet-based forecast via repo's `src.forecasting` (if available)

Notes:
- The synthetic dataset includes anomalies/regime shifts by design; metrics are for
  sanity-checking and demonstration rather than SOTA accuracy.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import json
import pandas as pd


@dataclass
class Slice:
    provider: str
    service: str
    region: str
    category: str

    def label(self) -> str:
        return f"{self.provider}/{self.service}/{self.region}/{self.category}"


def load_slice(csv_path: Path, sl: Slice) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df["date"] = pd.to_datetime(df["date"])

    sdf = df[
        (df["provider"] == sl.provider)
        & (df["service"] == sl.service)
        & (df["region"] == sl.region)
        & (df["category"] == sl.category)
    ].copy()

    if sdf.empty:
        raise SystemExit(f"No rows for slice {sl.label()}")

    daily = (
        sdf.groupby("date", as_index=False)["value"]
        .sum()
        .rename(columns={"date": "ds", "value": "y"})
        .sort_values("ds")
        .reset_index(drop=True)
    )
    return daily


def rolling_ma_backtest(daily: pd.DataFrame, holdout_days: int, window_days: int) -> pd.DataFrame:
    if holdout_days <= 0:
        raise ValueError("holdout_days must be > 0")
    if len(daily) <= holdout_days + window_days:
        raise ValueError("not enough history for backtest")

    train = daily.iloc[: -holdout_days].reset_index(drop=True)
    test = daily.iloc[-holdout_days:].reset_index(drop=True)

    hist = train["y"].astype(float).tolist()
    preds = []
    for i in range(len(test)):
        mu = float(pd.Series(hist[-window_days:]).mean())
        preds.append(mu)
        hist.append(float(test.loc[i, "y"]))

    out = test.copy()
    out["yhat"] = preds
    out["model"] = f"ma_{window_days}"
    return out


def mape(y: pd.Series, yhat: pd.Series) -> float:
    y = y.astype(float)
    yhat = yhat.astype(float)
    denom = y.abs().replace(0, 1e-9)
    return float(((y - yhat).abs() / denom).mean() * 100.0)


def smape(y: pd.Series, yhat: pd.Series) -> float:
    y = y.astype(float)
    yhat = yhat.astype(float)
    denom = (y.abs() + yhat.abs()).replace(0, 1e-9)
    return float((2.0 * (y - yhat).abs() / denom).mean() * 100.0)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data/synthetic_cloud_costs.csv")
    ap.add_argument("--provider", default=None)
    ap.add_argument("--service", default=None)
    ap.add_argument("--region", default=None)
    ap.add_argument("--category", default=None)
    ap.add_argument("--holdout-days", type=int, default=30)
    ap.add_argument("--window-days", type=int, default=14)
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise SystemExit(f"Missing dataset: {csv_path}")

    df0 = pd.read_csv(csv_path, nrows=1)
    sl = Slice(
        provider=args.provider or str(df0.loc[0, "provider"]),
        service=args.service or str(df0.loc[0, "service"]),
        region=args.region or str(df0.loc[0, "region"]),
        category=args.category or str(df0.loc[0, "category"]),
    )

    daily = load_slice(csv_path, sl)
    bt = rolling_ma_backtest(daily, holdout_days=args.holdout_days, window_days=args.window_days)

    res = {
        "slice": sl.label(),
        "rows": int(len(daily)),
        "holdout_days": int(args.holdout_days),
        "baseline": {
            "method": f"{args.window_days}-day moving average (1-step rolling)",
            "MAPE_percent": round(mape(bt["y"], bt["yhat"]), 2),
            "SMAPE_percent": round(smape(bt["y"], bt["yhat"]), 2),
        },
    }

    # Optional: compare to Prophet forecast if src.forecasting is importable.
    try:
        from src.forecasting import train_predict  # type: ignore

        train = daily.iloc[: -args.holdout_days].copy()
        train["ds"] = pd.to_datetime(train["ds"])

        _model, fcst = train_predict(train, periods=args.holdout_days, interval_width=0.9)
        fcst = fcst.tail(args.holdout_days).copy()
        fcst["ds"] = pd.to_datetime(fcst["ds"]).dt.normalize()

        merged = pd.merge(
            daily.tail(args.holdout_days).assign(ds=lambda x: pd.to_datetime(x["ds"]).dt.normalize()),
            fcst[["ds", "yhat"]],
            on="ds",
            how="inner",
        )
        if len(merged) == args.holdout_days:
            res["prophet"] = {
                "MAPE_percent": round(mape(merged["y"], merged["yhat"]), 2),
                "SMAPE_percent": round(smape(merged["y"], merged["yhat"]), 2),
                "intervalWidth": 0.9,
            }
    except Exception:
        pass

    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
