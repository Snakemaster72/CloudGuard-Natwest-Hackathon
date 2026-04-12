import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os


def generate_mock_data(
    output_path: str = "data/aws_costs_mock.csv",
    days: int = 365,
    seed: int = 42,
    categories: tuple[str, ...] = ("compute", "storage", "network"),
    regions: tuple[str, ...] = ("eu-west-2", "eu-central-1"),
    providers: tuple[str, ...] = ("aws", "gcp"),
    services: tuple[str, ...] = (
        # Deprecated: kept for backward compatibility, but service generation is provider-aware.
        "ec2",
        "eks",
        "s3",
        "cloudwatch",
        "gke",
        "cloud_storage",
        "cloud_logging",
    ),
):
    """Generate a realistic synthetic daily cloud cost dataset.

    Properties:
    - Trend: gradual growth over time (startup scaling)
    - Seasonality: weekly (weekday/weekend) + month boundary effects
    - Noise: small random fluctuations
    - Events/anomalies: deployments/autoscaling bugs (spikes) + optimizations (drops)

    Output schema (backwards compatible):
    - date (YYYY-MM-DD)
    - value (numeric)
    - category (optional)
    - region (optional)
    - provider (optional)
    - service (optional)
    - is_anomaly (0/1, debug)

    Notes:
    - Fixed RNG seed for reproducibility.
    - Emits multiple rows per day across dimensions; downstream aggregates to daily totals.
    """

    rng = np.random.default_rng(seed)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)
    dates = pd.date_range(start=start_date, end=end_date, freq="D")

    # Baseline daily spend
    base_cost = 140.0

    # Trend: startup growth
    t = np.linspace(0, 1, len(dates))
    trend = 45.0 * t + 22.0 * (t**2)

    # Weekly seasonality: weekdays higher than weekends
    dow = dates.dayofweek.to_numpy()
    weekly = np.where(dow < 5, rng.normal(26, 5, len(dates)), rng.normal(10, 3, len(dates)))

    # Month boundary effects (billing/reporting artifacts)
    dom = dates.day.to_numpy()
    month_effect = 6.0 * np.exp(-((dom - 1) ** 2) / (2 * 4.0**2)) + 9.0 * np.exp(-((dom - 28) ** 2) / (2 * 5.0**2))

    # Heteroskedastic noise
    noise = rng.normal(0, 2.5 + 1.5 * t, len(dates))

    value = base_cost + trend + weekly + month_effect + noise

    # Deterministic anomaly anchors
    is_anomaly = np.zeros(len(dates), dtype=int)
    spike_idx = [int(len(dates) * p) for p in (0.18, 0.42, 0.67, 0.88)]  # deployments/autoscaling incidents
    dip_idx = [int(len(dates) * p) for p in (0.28, 0.58, 0.78)]  # optimizations/commitments

    for idx in spike_idx:
        if 0 <= idx < len(value):
            value[idx] *= 1.9
            is_anomaly[idx] = 1

    for idx in dip_idx:
        if 0 <= idx < len(value):
            value[idx] *= 0.6
            is_anomaly[idx] = 1

    # Cost split weights (kept stable but with small daily drift)
    cat_weights = np.array([0.62, 0.23, 0.15])[: len(categories)]
    cat_weights = cat_weights / cat_weights.sum()

    reg_weights = np.array([0.7, 0.3])[: len(regions)]
    reg_weights = reg_weights / reg_weights.sum()

    prov_weights = np.array([0.78, 0.22])[: len(providers)]
    prov_weights = prov_weights / prov_weights.sum()

    # Provider-specific service catalogs aligned to the allowed categories in this dataset.
    # NOTE: Our dataset categories are only: compute/storage/network.
    PROVIDER_SERVICE_CATALOG = {
        "aws": {
            "compute": ["ec2", "eks", "lambda"],
            "storage": ["s3", "efs"],
            "network": ["cloudfront", "nat_gateway", "vpc_endpoints"],
        },
        "gcp": {
            "compute": ["compute_engine", "gke", "cloud_run"],
            "storage": ["cloud_storage"],
            "network": ["cloud_cdn", "cloud_nat"],
        },
    }

    def pick_service(provider: str, category: str) -> str:
        """Pick a service consistent with provider + category."""
        cat = category
        # allow mapping older categories into provider catalog groups
        if cat not in ("compute", "storage", "network"):
            cat = category

        services = PROVIDER_SERVICE_CATALOG.get(provider, {}).get(cat)
        if services:
            return rng.choice(services)

        # fallback: flatten provider catalog
        flattened = []
        for v in PROVIDER_SERVICE_CATALOG.get(provider, {}).values():
            flattened.extend(v)
        return rng.choice(flattened) if flattened else "unknown"

    rows = []
    for i, d in enumerate(dates):
        # Small drift in mixes
        cat_mix = rng.normal(cat_weights, 0.02)
        cat_mix = np.clip(cat_mix, 0.01, None)
        cat_mix = cat_mix / cat_mix.sum()

        reg_mix = rng.normal(reg_weights, 0.02)
        reg_mix = np.clip(reg_mix, 0.01, None)
        reg_mix = reg_mix / reg_mix.sum()

        prov_mix = rng.normal(prov_weights, 0.02)
        prov_mix = np.clip(prov_mix, 0.01, None)
        prov_mix = prov_mix / prov_mix.sum()

        for ci, c in enumerate(categories):
            for ri, r in enumerate(regions):
                for pi, p in enumerate(providers):
                    # allocate category share across provider+region
                    base_share = float(cat_mix[ci] * reg_mix[ri] * prov_mix[pi])

                    # provider-aware service pool for this provider+category
                    svc_pool = list(PROVIDER_SERVICE_CATALOG.get(p, {}).get(c, []))
                    if not svc_pool:
                        # fallback: flatten provider catalog (should be rare)
                        svc_pool = []
                        for v in PROVIDER_SERVICE_CATALOG.get(p, {}).values():
                            svc_pool.extend(v)

                    # normalize per-(provider,category) service weights
                    svc_w = rng.random(len(svc_pool)) if svc_pool else np.array([1.0])
                    svc_w = svc_w / svc_w.sum()

                    for si, svc in enumerate(svc_pool):
                        share = base_share * float(svc_w[si])

                        v = float(np.round(value[i] * share, 2))
                        rows.append(
                            {
                                "date": d.strftime("%Y-%m-%d"),
                                "value": v,
                                "category": c,
                                "region": r,
                                "provider": p,
                                "service": svc,
                                "is_anomaly": int(is_anomaly[i]),
                            }
                        )

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    return df


def to_prophet_format(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate to daily totals and convert to Prophet format (ds, y)."""
    out = df.copy()
    out["date"] = pd.to_datetime(out["date"], errors="coerce")
    out = out.dropna(subset=["date", "value"])
    out = out.groupby("date", as_index=False)["value"].sum()
    out = out.sort_values("date")
    return out.rename(columns={"date": "ds", "value": "y"})


if __name__ == "__main__":
    generate_mock_data()
