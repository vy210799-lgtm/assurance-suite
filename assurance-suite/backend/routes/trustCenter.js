const express = require("express");
const router = express.Router();
const { db, logActivity } = require("../db");
const { TRUST_CENTER_MODULES, loadTrustCenter } = require("../lib/trustCenter");

function requireModule(req, res, next) {
  if (!TRUST_CENTER_MODULES.includes(req.params.module)) {
    return res.status(400).json({ error: `Trust center is not available for "${req.params.module}" (external audit engagements are excluded).` });
  }
  next();
}
router.param("module", (req, res, next) => next());

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function placeholderDocs() {
  return [
    { name: "SOC 2 Type II report", type: "Certification", status: "Current", updatedDate: todayStr(), url: "" },
    { name: "ISO 27001 certificate", type: "Certification", status: "Current", updatedDate: todayStr(), url: "" },
    { name: "Penetration test summary", type: "Report", status: "Current", updatedDate: todayStr(), url: "" },
    { name: "Security questionnaire (CAIQ)", type: "Questionnaire", status: "Awaiting update", updatedDate: todayStr(), url: "" },
  ];
}

// Runs from the server, so — unlike a browser call — this is not blocked by
// the vendor's CORS policy. Still requires the endpoint to be reachable and
// to return { documents: [...] }; otherwise we fall back to placeholder data
// and say so, rather than pretending it's live.
async function fetchLive(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (json && Array.isArray(json.documents)) return json.documents;
  } catch (e) { /* unreachable, non-JSON, or timed out */ }
  return null;
}

function upsertConnection(moduleKey, recordId, { provider, portalUrl, documents, liveData }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO trust_centers (module, record_id, connected, provider, portal_url, last_synced, live_data)
    VALUES (?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(module, record_id) DO UPDATE SET
      connected = 1, provider = excluded.provider, portal_url = excluded.portal_url,
      last_synced = excluded.last_synced, live_data = excluded.live_data
  `).run(moduleKey, recordId, provider || "", portalUrl || "", now, liveData ? 1 : 0);

  const row = db.prepare("SELECT id FROM trust_centers WHERE module = ? AND record_id = ?").get(moduleKey, recordId);
  db.prepare("DELETE FROM trust_center_documents WHERE trust_center_id = ?").run(row.id);
  const insert = db.prepare("INSERT INTO trust_center_documents (trust_center_id, name, type, status, updated_date, url) VALUES (?, ?, ?, ?, ?, ?)");
  for (const d of documents) insert.run(row.id, d.name, d.type || "", d.status || "", d.updatedDate || todayStr(), d.url || "");
  return row.id;
}

router.get("/trust-center/:module/:recordId", requireModule, (req, res) => {
  res.json(loadTrustCenter(req.params.module, req.params.recordId));
});

router.post("/trust-center/:module/:recordId/connect", requireModule, async (req, res) => {
  const { provider, portalUrl } = req.body || {};
  if (!portalUrl || !portalUrl.trim()) return res.status(400).json({ error: "portalUrl is required" });
  const live = await fetchLive(portalUrl);
  upsertConnection(req.params.module, req.params.recordId, { provider, portalUrl, documents: live || placeholderDocs(), liveData: !!live });
  logActivity(req.params.module, "Trust center connected", `${req.params.recordId} → ${provider || portalUrl}`);
  res.json(loadTrustCenter(req.params.module, req.params.recordId));
});

router.post("/trust-center/:module/:recordId/sync", requireModule, async (req, res) => {
  const existing = db.prepare("SELECT * FROM trust_centers WHERE module = ? AND record_id = ?").get(req.params.module, req.params.recordId);
  if (!existing) return res.status(404).json({ error: "Not connected yet" });
  const live = await fetchLive(existing.portal_url);
  upsertConnection(req.params.module, req.params.recordId, { provider: existing.provider, portalUrl: existing.portal_url, documents: live || placeholderDocs(), liveData: !!live });
  logActivity(req.params.module, "Trust center synced", req.params.recordId);
  res.json(loadTrustCenter(req.params.module, req.params.recordId));
});

router.delete("/trust-center/:module/:recordId", requireModule, (req, res) => {
  db.prepare("DELETE FROM trust_centers WHERE module = ? AND record_id = ?").run(req.params.module, req.params.recordId);
  logActivity(req.params.module, "Trust center disconnected", req.params.recordId);
  res.json({ connected: false, provider: "", portalUrl: "", lastSynced: null, documents: [], liveData: false });
});

// Prompt-driven lookup: "SOC 2 report" -> matching document, checking the
// synced list first and falling back to a live search query if the endpoint
// supports one.
router.get("/trust-center/:module/:recordId/find", requireModule, async (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  if (!q) return res.status(400).json({ error: "q is required" });
  const tc = loadTrustCenter(req.params.module, req.params.recordId);
  let match = tc.documents.find((d) => d.name.toLowerCase().includes(q) || (d.type || "").toLowerCase().includes(q));
  if (!match && tc.liveData && tc.portalUrl) {
    try {
      const sep = tc.portalUrl.includes("?") ? "&" : "?";
      const res2 = await fetch(`${tc.portalUrl}${sep}q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
      if (res2.ok) {
        const json = await res2.json().catch(() => null);
        if (json && Array.isArray(json.documents) && json.documents[0]) match = json.documents[0];
      }
    } catch (e) { /* search endpoint unavailable */ }
  }
  if (!match) return res.status(404).json({ error: `No document matching "${q}"` });
  res.json(match);
});

// Proxies the actual file through the server so the browser never has to
// deal with the vendor's CORS policy directly.
router.get("/trust-center/:module/:recordId/documents/:docId/download", requireModule, async (req, res) => {
  const doc = db.prepare("SELECT * FROM trust_center_documents WHERE id = ?").get(req.params.docId);
  if (!doc || !doc.url) return res.status(404).json({ error: "This document has no source link to download from." });
  try {
    const upstream = await fetch(doc.url, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok || !upstream.body) throw new Error(`Upstream returned ${upstream.status}`);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.name.replace(/"/g, "")}"`);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    // Most vendor portals require an authenticated session, so a direct
    // fetch will often fail — hand back the source link so the client can
    // open it in a new tab instead.
    res.status(502).json({ error: "Could not fetch the file directly (it may require login on the vendor's site).", url: doc.url });
  }
});

module.exports = router;
