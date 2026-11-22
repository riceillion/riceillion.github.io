const ONLINE = (() => {
  const cfg = window.RICEILLION_CONFIG || {};
  const url = (cfg.supabaseUrl || "").trim().replace(/\/+$/, "");
  const key = (cfg.supabaseKey || "").trim();
  const enabled = Boolean(url && key);

  // A random, anonymous ID per browser so one person isn't counted twice.
  const playerId = (() => {
    try {
      let id = localStorage.getItem("riceillion-player");
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("riceillion-player", id);
      }
      return id;
    } catch {
      return `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  })();

  async function post(path, body, wantData) {
    if (!enabled) return null;
    try {
      const headers = { apikey: key, "Content-Type": "application/json" };
      if (!wantData) headers.Prefer = "return=minimal";
      const res = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        console.warn(`Riceillion database: ${path} failed (${res.status})`, await res.text());
        return null;
      }
      return wantData ? await res.json() : true;
    } catch (err) {
      console.warn("Riceillion database unreachable", err);
      return null;
    }
  }

  return {
    enabled,
    playerId,
    /** Save one answer: { mode, flight, prompt, raw, matched, points, final } */
    logAnswer: (row) => post("answers", { player: playerId, ...row }),
    /** Save a finished flight: { mode, flight, score } */
    logFlight: (row) => post("flights", { player: playerId, ...row }),
    /** Save a suggestion: { kind: "answer" | "prompt", prompt, suggestion, note } */
    suggest: (row) => post("suggestions", { player: playerId, ...row }),
    /** [{ prompt, answer, n }] for the given prompt texts */
    promptStats: (prompts) => post("rpc/prompt_stats", { p_prompts: prompts }, true),
    /** [{ score, n }] for tonight's daily flight */
    flightStats: (flight) => post("rpc/flight_stats", { p_flight: flight }, true),
  };
})();
