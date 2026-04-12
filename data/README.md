# Synthetic dataset (single source of truth)

Canonical file:
- `data/synthetic_cloud_costs.csv`

This dataset is synthetic but designed to mimic AWS/GCP billing behaviour for a startup:
- gradual growth (scaling infrastructure)
- weekday/weekend seasonality (business traffic)
- deterministic spikes (deployments/autoscaling incidents)
- deterministic drops (optimizations/commitments)

Schema:
- `date` (YYYY-MM-DD)
- `value` (float)
- `category` (e.g. compute/storage/network)
- `region` (e.g. eu-west-2)
- `provider` (aws|gcp)
- `service` (e.g. ec2, eks, s3, bigquery, gke)
- `is_anomaly` (0/1, debug only)

Regenerate:
```bash
python scripts/generate_dataset.py
```

The ML service reads this dataset directly and every feature (forecast/baseline/anomalies/scenario) derives its outputs from it.
