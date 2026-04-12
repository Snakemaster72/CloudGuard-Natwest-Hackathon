export function buildMlClient({ ML_SERVICE_URL }) {
  if (!ML_SERVICE_URL) throw new Error("Missing ML_SERVICE_URL");

  async function mlPost(path, body) {
    const resp = await fetch(`${ML_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`ML error ${resp.status}: ${text}`);
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    return resp.json();
  }

  async function mlGet(path, query) {
    const qs = new URLSearchParams(query || {}).toString();
    const url = `${ML_SERVICE_URL}${path}${qs ? `?${qs}` : ""}`;
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error(`ML error ${resp.status}: ${text}`);
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    return resp.json();
  }

  return { mlPost, mlGet };
}
