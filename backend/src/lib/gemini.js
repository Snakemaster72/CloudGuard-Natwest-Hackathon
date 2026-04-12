import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const ExplainRequestSchema = z.object({
  task: z.enum(["forecast_explanation", "anomaly_explanation", "scenario_interpretation"]),
  payload: z.record(z.any()),
});

export const ExplainResponseSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()).default([]),
  actions: z.array(z.string()).optional(),
  disclaimer: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  question: z.string().min(1),
  facts: z.record(z.any()).default({}),
});

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ path: z.string(), value: z.any() })).default([]),
  followUps: z.array(z.string()).default([]),
});

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(key);
}

export function cloudguardSystemPrompt() {
  return (
    "You are CloudGuard, a concise cloud cost (FinOps) assistant for AWS/GCP startups. " +
    "You explain changes in cloud spend using infrastructure drivers (compute, storage, network egress, logs/monitoring, data processing). " +
    "Be non-technical and action-oriented. Never mention Prophet or internal model names. " +
    "Only use numbers and facts present in the JSON input. Do not invent services, regions, or events. " +
    "Return ONLY valid JSON matching the provided schema."
  );
}

export function tryParseJsonFromText(text) {
  // Best effort:
  // 1) direct JSON
  // 2) strip markdown fences
  // 3) extract first {...} block
  const t = String(text ?? "").trim();
  try {
    return JSON.parse(t);
  } catch {
    // continue
  }

  const noFences = t
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(noFences);
  } catch {
    // continue
  }

  const start = noFences.indexOf("{");
  const end = noFences.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = noFences.slice(start, end + 1);
    return JSON.parse(candidate);
  }

  throw new Error("Gemini returned non-JSON output");
}

export async function generateGeminiJson({ model, prompt, schema, retryHint }) {
  // 2 attempts: initial + one repair attempt
  const attempts = [null, retryHint].filter(Boolean);

  for (const hint of attempts) {
    const finalPrompt = hint
      ? {
          ...prompt,
          repair_hint: hint,
        }
      : prompt;

    const res = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(finalPrompt) }],
        },
      ],
    });

    const text = res?.response?.text?.() ?? res?.response?.text ?? "";
    const parsed = tryParseJsonFromText(text);
    return schema.parse(parsed);
  }

  throw new Error("Gemini generation failed");
}

export function fallbackExplain(task, payload) {
  const facts = payload?.facts ?? payload ?? {};
  const slice = facts?.slice?.label || "selected slice";

  if (task === "forecast_explanation") {
    const fs = facts?.forecastSummary;
    const end = fs?.endDate ? `by ${fs.endDate}` : "over the forecast horizon";
    const y = typeof fs?.endYhat === "number" ? fs.endYhat.toFixed(2) : null;
    const lo = typeof fs?.endLower === "number" ? fs.endLower.toFixed(2) : null;
    const hi = typeof fs?.endUpper === "number" ? fs.endUpper.toFixed(2) : null;

    return {
      title: `Forecast summary (${slice})`,
      bullets: [
        y ? `Projected daily spend ${end} is ~$${y}.` : `Forecast is ready ${end}.`,
        lo && hi ? `Expected range is ~$${lo} to ~$${hi} per day.` : "Uncertainty band is available in the chart.",
        "If spend rises faster than expected, common drivers are compute autoscaling, logging volume, or egress.",
      ],
      actions: ["Set a budget alert for the forecast upper bound", "Track spend by service and region to confirm the driver"],
      disclaimer: "LLM explanation unavailable; this is a deterministic fallback.",
    };
  }

  if (task === "anomaly_explanation") {
    const latest = facts?.anomaliesSummary?.latest;
    const ds = latest?.ds || "the latest day";
    const actual = typeof latest?.actual === "number" ? latest.actual.toFixed(2) : null;
    const upper = typeof latest?.upper === "number" ? latest.upper.toFixed(2) : null;

    return {
      title: `Anomaly check (${slice})`,
      bullets: [
        actual && upper
          ? `${ds} was outside the expected range (actual ~$${actual} vs upper ~$${upper}).`
          : "A recent day fell outside the expected range.",
        "Common drivers include sudden traffic changes, misconfigured logging, or increased egress.",
      ],
      actions: ["Break down spend by service", "Check recent deploys/autoscaling changes"],
      disclaimer: "LLM explanation unavailable; this is a deterministic fallback.",
    };
  }

  // scenario_interpretation
  const d = facts?.scenarioSummary?.delta;
  const total = typeof d?.deltaTotal === "number" ? d.deltaTotal.toFixed(2) : null;
  return {
    title: `Scenario impact (${slice})`,
    bullets: [total ? `Total change over horizon: ~$${total}.` : "Scenario impact computed."],
    actions: ["If impact is high, validate assumptions and consider staged rollouts"],
    disclaimer: "LLM explanation unavailable; this is a deterministic fallback.",
  };
}
