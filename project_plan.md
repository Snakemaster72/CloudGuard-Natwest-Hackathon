# Hackathon Use Case: AI Predictive Forecasting

[cite_start]Participants are asked to build solutions using a free-tier AI of their choice to predict future trends using a dataset[cite: 1, 2, 3]. [cite_start]This hackathon use case is presented by NatWest Group[cite: 18].

## Problem Statement

[cite_start]People make better decisions when they understand what the future may look like[cite: 4, 5]. [cite_start]Today, many teams rely only on past data and lack accessible forecasting tools[cite: 6]. [cite_start]Your task is to help users look ahead instead of backwards[cite: 7, 8]. [cite_start]The goal is to get honest signals, not overconfident predictions[cite: 8]. [cite_start]Users need to understand uncertainty and take early action[cite: 9]. [cite_start]The final solution should be simple, reliable, and transparent[cite: 10].

## Description

[cite_start]You must create a tool that transforms historical data into useful forecasts[cite: 11, 12]. Your solution should do the following:
* [cite_start]Predict likely values for future periods[cite: 13].
* [cite_start]Show a range of outcomes rather than just a single number[cite: 14].
* [cite_start]Compare predictions to a simple baseline to avoid over-fitting[cite: 15].
* [cite_start]Detect early warning signs such as sudden changes[cite: 16].
* [cite_start]Provide explanations short enough for non-experts[cite: 16].
* [cite_start]Keep the experience lightweight, trustworthy, and fast[cite: 17].
* [cite_start]Provide clear visibility into how results were produced[cite: 17].

---

## Use Cases

### 1. Plan Ahead (Short-Term Forecasting)
[cite_start]Users ask what the next few weeks will look like for sales, traffic, or usage[cite: 20, 21, 22, 23, 24]. The AI system should:
* [cite_start]Generate forecasts for 1-6 weeks or similar short horizons[cite: 25, 26].
* [cite_start]Provide a range including low, likely, and high metrics to show uncertainty[cite: 26].
* [cite_start]Highlight the key patterns behind the prediction, such as trend and seasonality[cite: 27].
* [cite_start]Display results in intuitive formats using charts and a short text summary[cite: 28].
* [cite_start]**Output example:** Next 4 weeks: central estimate +6% growth[cite: 29, 30].
* [cite_start]**Output example:** Lower bound: -2%[cite: 30].
* [cite_start]**Output example:** Upper bound: +12%[cite: 30].
* [cite_start]**Output example:** Seasonal spike expected in Week 3[cite: 30].

### 2. Spot Trouble Early (Anomaly Detection)
[cite_start]Users ask if there are any sudden changes they should look at[cite: 31, 32, 33, 34, 35]. The AI should:
* [cite_start]Flag unexpected spikes or dips[cite: 36, 37].
* [cite_start]Show whether the movement is outside the normal forecast range[cite: 38].
* [cite_start]Provide explanations and likely causes[cite: 38].
* [cite_start]Suggest next steps, such as investigating a region or checking system logs[cite: 39].
* [cite_start]**Output example:** Yesterday's churn rate was unusually high at 1.9%, exceeding the forecast band[cite: 40, 41].
* [cite_start]**Output example:** Potential drivers include reduced login success rate and an increase in support tickets[cite: 42].

### 3. Compare Plans (Scenario Forecasting)
[cite_start]Users ask what happens if traffic increases by 10% or if they keep the last month's trend[cite: 43, 44, 45, 46]. The AI should let users test simple scenarios by allowing them to:
* [cite_start]Adjust the growth rate[cite: 47, 48, 49].
* [cite_start]Remove recent outliers[cite: 50].
* [cite_start]Apply flat or seasonal patterns[cite: 51].
* [cite_start]Generate side-by-side comparisons[cite: 52].
* [cite_start]Summarize the difference clearly[cite: 52].
* [cite_start]**Output example:** Under a + 10% traffic scenario, conversions are expected to reach 18,000 versus 15,900 in the baseline[cite: 53, 54].
* [cite_start]**Output example:** Range: 17,200-19,500[cite: 54].

---

## Learning Outcomes

[cite_start]Participants will learn the following core concepts[cite: 55, 56]:

### Judging Forecasting Approaches
* [cite_start]Ways to look ahead and how to judge if the approach helps[cite: 57].
* [cite_start]How simple forecasting methods work, including moving averages and exponential smoothing[cite: 58].
* [cite_start]When more advanced models are justified[cite: 59].
* [cite_start]How to validate forecasts using hold-out data[cite: 60].

### The Importance of Simple Comparisons
* [cite_start]Why simple comparisons matter when testing ideas[cite: 61].
* [cite_start]How baseline forecasts provide a sanity check[cite: 62].
* [cite_start]Why accuracy can be misleading without a reference[cite: 63].
* [cite_start]How simple models often outperform overly complex ones[cite: 64].

### Communicating Uncertainty
* [cite_start]How to talk about uncertainty so people use it well[cite: 65].
* [cite_start]How to communicate forecast ranges[cite: 66].
* [cite_start]Why uncertainty is not an "error" but rather information[cite: 67].
* [cite_start]How to make ranges intuitive for non-technical audiences[cite: 68].