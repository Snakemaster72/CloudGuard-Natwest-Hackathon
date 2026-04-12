import express from "express";

import {
  ExplainRequestSchema,
  ExplainResponseSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  cloudguardSystemPrompt,
  fallbackExplain,
  generateGeminiJson,
  getGeminiClient,
} from "../lib/gemini.js";

export function buildGeminiRoutes() {
  const router = express.Router();

  router.post("/explain", async (req, res) => {
    try {
      const parsed = ExplainRequestSchema.parse(req.body);
      const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = {
        system: cloudguardSystemPrompt(),
        input: {
          task: parsed.task,
          ...parsed.payload,
        },
        output_schema: {
          title: "string",
          bullets: "string[]",
          actions: "string[]?",
          disclaimer: "string?",
        },
        style_rules: [
          "Max 5 bullets",
          "Max 4 actions",
          "Prefer phrases like 'compute usage', 'egress', 'storage growth', 'logging volume'",
          "If cause is unclear, say what additional breakdown is needed (service/provider/region)",
        ],
      };

      try {
        const json = await generateGeminiJson({
          model,
          prompt,
          schema: ExplainResponseSchema,
          retryHint:
            "Fix your output to be valid JSON with keys: title (string), bullets (string array), optional actions (string array), optional disclaimer (string).",
        });
        res.json(json);
      } catch {
        // Deterministic fallback for quota/model/parse issues
        res.json(fallbackExplain(parsed.task, parsed.payload));
      }
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  router.post("/chat", async (req, res) => {
    try {
      const parsed = ChatRequestSchema.parse(req.body);
      const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = {
        system:
          cloudguardSystemPrompt() +
          " Answer using only the FACTS JSON. If the answer requires missing data, say exactly what is missing. Return ONLY JSON.",
        question: parsed.question,
        facts: parsed.facts,
        required_output: {
          answer: "string",
          citations: "{path:string,value:any}[]",
          followUps: "string[]",
        },
        style_rules: [
          "Keep the answer under 80 words",
          "Use $ for currency when values appear",
          "Prefer practical next steps (budgets, alerts, tagging, rightsizing)",
        ],
      };

      try {
        const json = await generateGeminiJson({
          model,
          prompt,
          schema: ChatResponseSchema,
          retryHint:
            "Fix your output to be valid JSON with keys: answer (string), citations (array of {path,value}), followUps (string array).",
        });
        res.json(json);
      } catch {
        res.json({
          answer:
            "LLM is temporarily unavailable. If you share a service/provider breakdown and the date range, I can help pinpoint the cost driver.",
          citations: [],
          followUps: [
            "Which provider/service is driving the spike?",
            "Show spend by region for the last 7 days",
            "Did you deploy or change autoscaling recently?",
          ],
        });
      }
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  return router;
}
