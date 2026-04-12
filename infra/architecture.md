# Architecture

```text
React (CloudGuard UI)  →  Node API gateway  →  Python ML service
         │                      │                 │
         │                      └── Gemini (cloud-aware explain/chat)
         └──────────────────────────────────────────

Single source of truth:
- `data/synthetic_cloud_costs.csv` (synthetic AWS/GCP-style spend)

Optional (post-hackathon):
- Postgres for uploaded bills, run metadata, scenario definitions
```
