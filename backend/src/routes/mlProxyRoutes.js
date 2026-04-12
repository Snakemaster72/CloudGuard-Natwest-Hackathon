import express from "express";
import { sendProxyError, queryToSeriesBody } from "../lib/httpErrors.js";

export function buildMlProxyRoutes({ mlPost, mlGet }) {
  const router = express.Router();

  // --- Analytics proxy endpoints ---
  router.post("/forecast", async (req, res) => {
    try {
      const data = await mlPost("/ml/forecast", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/baseline", async (req, res) => {
    try {
      const data = await mlPost("/ml/baseline", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/anomalies", async (req, res) => {
    try {
      const data = await mlPost("/ml/anomalies", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/scenario/run", async (req, res) => {
    try {
      const data = await mlPost("/ml/scenario", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.get("/dataset", async (req, res) => {
    try {
      const data = await mlGet("/ml/dataset", req.query);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/forecast_from_dataset", async (req, res) => {
    try {
      const data = await mlPost("/ml/forecast_from_dataset", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/baseline_from_dataset", async (req, res) => {
    try {
      const data = await mlPost("/ml/baseline_from_dataset", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/anomalies_from_dataset", async (req, res) => {
    try {
      const data = await mlPost("/ml/anomalies_from_dataset", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/scenario_from_dataset", async (req, res) => {
    try {
      const data = await mlPost("/ml/scenario_from_dataset", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.post("/series_from_dataset", async (req, res) => {
    try {
      const data = await mlPost("/ml/series_from_dataset", req.body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  router.get("/series_from_dataset", async (req, res) => {
    try {
      const body = queryToSeriesBody(req.query);
      const data = await mlPost("/ml/series_from_dataset", body);
      res.json(data);
    } catch (e) {
      sendProxyError(res, e);
    }
  });

  return router;
}
