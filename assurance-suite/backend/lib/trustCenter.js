const { db } = require("../db");

// External audit is intentionally excluded — engagements are tracked through
// the auditor's own PBC/query workflow, not a vendor-style trust portal.
const TRUST_CENTER_MODULES = ["audits", "vendors", "controls", "policies"];

function loadTrustCenter(moduleKey, recordId) {
  const row = db.prepare("SELECT * FROM trust_centers WHERE module = ? AND record_id = ?").get(moduleKey, recordId);
  if (!row) return { connected: false, provider: "", portalUrl: "", lastSynced: null, documents: [], liveData: false };
  const docs = db.prepare("SELECT * FROM trust_center_documents WHERE trust_center_id = ? ORDER BY id").all(row.id);
  return {
    connected: !!row.connected,
    provider: row.provider || "",
    portalUrl: row.portal_url || "",
    lastSynced: row.last_synced,
    liveData: !!row.live_data,
    documents: docs.map((d) => ({ id: d.id, name: d.name, type: d.type, status: d.status, updatedDate: d.updated_date, url: d.url || "" })),
  };
}

module.exports = { TRUST_CENTER_MODULES, loadTrustCenter };
