import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { buildMlClient } from "./lib/mlClient.js";
import { buildMlProxyRoutes } from "./routes/mlProxyRoutes.js";
import { buildGeminiRoutes } from "./routes/geminiRoutes.js";

dotenv.config();
// Prefer repo-root .env for local dev (keeps env in one place)
dotenv.config({ path: new URL("../../.env", import.meta.url).pathname });

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);

const PORT = Number(process.env.PORT || 8000);
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const { mlPost, mlGet } = buildMlClient({ ML_SERVICE_URL });

// ML proxy routes (/api/*)
app.use("/api", buildMlProxyRoutes({ mlPost, mlGet }));

// Gemini routes (/api/explain, /api/chat)
app.use("/api", buildGeminiRoutes());

app.listen(PORT, () => {
  console.log(`CloudGuard backend listening on http://localhost:${PORT}`);
});
