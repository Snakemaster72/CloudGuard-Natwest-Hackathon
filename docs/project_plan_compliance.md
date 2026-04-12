# CloudGuard compliance with hackathon `project_plan.md`

This document maps the required capabilities described in `project_plan.md` to the current CloudGuard implementation.

> Scope note: `project_plan.md` is the hackathon makers’ use-case brief. CloudGuard is a cloud spend intelligence interpretation of the same forecasting/anomaly/scenario requirements.

## Summary

- **Compliant** with the core product requirements: forecasting with ranges, baseline comparison, anomaly detection, scenario simulation, and concise explanations.
- **Partial** on: explicitly surfacing “trend/seasonality” drivers, and scenario options beyond multipliers/unit-rate (e.g., removing outliers, flat vs seasonal toggles).
- **Gap** on: a first-class, repeatable hold-out validation workflow inside the product (a script exists; UI reporting is not yet integrated).

---

## 1) Description requirements

From `project_plan.md` (Description section):

- Predict likely values for future periods
  - **Status:** ✅ Implemented
  - **Where:** ML service (`/ml/forecast*`), frontend “Run forecast” flow.

- Show a range of outcomes rather than just a single number
  - **Status:** ✅ Implemented
  - **Where:** Forecast includes `yhat_lower` / `yhat_upper` and is displayed as an uncertainty band.

- Compare predictions to a simple baseline to avoid over-fitting
  - **Status:** ✅ Implemented
  - **Where:** Baseline endpoint (`/ml/baseline*`), baseline chart panel in UI.

- Detect early warning signs such as sudden changes
  - **Status:** ✅ Implemented
  - **Where:** `/ml/anomalies*` flags historical points outside the forecast band.

- Provide explanations short enough for non-experts
  - **Status:** ✅ Implemented (with fallback)
  - **Where:** Backend Gemini endpoints `/api/explain` and `/api/chat`; deterministic fallback if `GEMINI_API_KEY` is missing.

- Keep the experience lightweight, trustworthy, and fast
  - **Status:** ✅ Implemented
  - **Where:**
    - Filter-safe UI prevents invalid combinations.
    - Empty slices return **422** with friendly UI messaging instead of confusing 500 errors.

- Provide clear visibility into how results were produced
  - **Status:** ✅ Implemented (basic)
  - **Where:** “Facts sent to LLM (debug)” panel; explicit baseline panel.

---

## 2) Use case coverage

### Use case 1: Plan Ahead (Short-Term Forecasting)

- Generate forecasts for 1–6 weeks
  - **Status:** ✅ Implemented
  - **Evidence:** Horizon is configurable (days) and supports typical short horizons.

- Provide a range including low/likely/high
  - **Status:** ✅ Implemented

- Highlight key patterns behind the prediction (trend/seasonality)
  - **Status:** ⚠️ Partial
  - **Reason:** The model can capture these patterns, but CloudGuard does not yet expose explicit “trend/seasonality” components in UI outputs.

- Display results in intuitive formats (charts + short summary)
  - **Status:** ✅ Implemented

### Use case 2: Spot Trouble Early (Anomaly Detection)

- Flag unexpected spikes/dips
  - **Status:** ✅ Implemented

- Show whether movement is outside the normal forecast range
  - **Status:** ✅ Implemented

- Provide explanations and likely causes + suggest next steps
  - **Status:** ✅ Implemented (with fallback)

### Use case 3: Compare Plans (Scenario Forecasting)

- Adjust growth rate
  - **Status:** ✅ Implemented
  - **Evidence:** Workload multiplier effect.

- Remove recent outliers
  - **Status:** ❌ Not implemented

- Apply flat or seasonal patterns
  - **Status:** ❌ Not implemented

- Generate side-by-side comparisons
  - **Status:** ✅ Implemented

- Summarize difference clearly
  - **Status:** ✅ Implemented

---

## 3) Learning outcomes alignment

### Judging forecasting approaches / validation using hold-out data

- **Status:** ⚠️ Partial
- **Evidence:** A reproducible backtest script exists in `scripts/backtest.py`.
- **Remaining:** Integrate backtest results into docs/UI more clearly (and/or add an endpoint) so judges can reproduce it from the running stack.

### Importance of simple comparisons

- **Status:** ✅ Implemented
- **Evidence:** Baseline panel ensures a simple alternative forecast is available.

### Communicating uncertainty

- **Status:** ⚠️ Partial
- **Evidence:** Uncertainty bands are present.
- **Remaining:** Add UI copy/tooltips explaining that the band is an expected range (not an error) and how to use it for decisions.
