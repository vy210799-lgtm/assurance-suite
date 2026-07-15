const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

// Built into Node itself (v22.5.0+) — no npm package, no native compile step,
// which avoids the C++ build failures that better-sqlite3 can hit on
// resource-limited hosts like Render's free tier.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "assurance-suite.db");
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  title TEXT, area TEXT, type TEXT, risk_rating TEXT, status TEXT,
  lead_auditor TEXT, start_date TEXT, end_date TEXT,
  ra_inherent_risk TEXT, ra_residual_risk TEXT, ra_control_effectiveness TEXT, ra_notes TEXT,
  report_opinion TEXT, report_status TEXT DEFAULT 'Draft', report_summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY, audit_id TEXT REFERENCES audits(id) ON DELETE CASCADE,
  name TEXT, type TEXT, collected_by TEXT, status TEXT DEFAULT 'Pending',
  file_name TEXT, file_content TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT, evidence_id TEXT REFERENCES evidence(id) ON DELETE CASCADE,
  role TEXT, text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY, audit_id TEXT REFERENCES audits(id) ON DELETE CASCADE,
  title TEXT, severity TEXT, owner TEXT, due_date TEXT, status TEXT DEFAULT 'Open'
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, name TEXT, tier TEXT, category TEXT, owner TEXT,
  inherent_risk TEXT, residual_risk TEXT, contract_end TEXT, monitoring_status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS due_diligence (
  id TEXT PRIMARY KEY, vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  document TEXT, status TEXT, expiry_date TEXT
);
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY, vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  domain TEXT, score TEXT, assessed_by TEXT, date TEXT
);

CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY, audit_firm TEXT, type TEXT, period TEXT, status TEXT,
  lead_partner TEXT, start_date TEXT, end_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pbc_items (
  id TEXT PRIMARY KEY, engagement_id TEXT REFERENCES engagements(id) ON DELETE CASCADE,
  item TEXT, due_date TEXT, status TEXT, uploaded_by TEXT
);
CREATE TABLE IF NOT EXISTS query_log (
  id TEXT PRIMARY KEY, engagement_id TEXT REFERENCES engagements(id) ON DELETE CASCADE,
  question TEXT, response TEXT, status TEXT
);

CREATE TABLE IF NOT EXISTS controls (
  id TEXT PRIMARY KEY, name TEXT, process TEXT, type TEXT, automation TEXT,
  frequency TEXT, owner TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY, control_id TEXT REFERENCES controls(id) ON DELETE CASCADE,
  period TEXT, sample_size TEXT, result TEXT, exceptions TEXT, tester TEXT, date TEXT
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY, title TEXT, category TEXT, owner TEXT, version TEXT,
  effective_date TEXT, review_date TEXT, status TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attestations (
  id TEXT PRIMARY KEY, policy_id TEXT REFERENCES policies(id) ON DELETE CASCADE,
  name TEXT, acknowledged TEXT, date TEXT
);

CREATE TABLE IF NOT EXISTS trust_centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL, record_id TEXT NOT NULL, connected INTEGER DEFAULT 0,
  provider TEXT, portal_url TEXT, last_synced TEXT, live_data INTEGER DEFAULT 0,
  UNIQUE(module, record_id)
);
CREATE TABLE IF NOT EXISTS trust_center_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trust_center_id INTEGER REFERENCES trust_centers(id) ON DELETE CASCADE,
  name TEXT, type TEXT, status TEXT, updated_date TEXT, url TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, module TEXT, action TEXT, detail TEXT,
  time TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS counters (
  module TEXT PRIMARY KEY, n INTEGER DEFAULT 0
);
`);

function uid() {
  return crypto.randomBytes(6).toString("hex");
}

// Ledger-style IDs, e.g. IA-2026-0001, scoped per module via the counters table.
function nextId(moduleKey, prefix) {
  const row = db.prepare("SELECT n FROM counters WHERE module = ?").get(moduleKey);
  const n = (row ? row.n : 0) + 1;
  db.prepare("INSERT INTO counters (module, n) VALUES (?, ?) ON CONFLICT(module) DO UPDATE SET n = ?").run(moduleKey, n, n);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

function logActivity(moduleLabel, action, detail) {
  db.prepare("INSERT INTO activity_log (module, action, detail) VALUES (?, ?, ?)").run(moduleLabel, action, detail || "");
}

// snake_case row -> camelCase object (shallow; nested shaping is done per-route)
function toCamel(row) {
  if (!row) return row;
  const out = {};
  for (const k of Object.keys(row)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = row[k];
  }
  return out;
}

module.exports = { db, uid, nextId, logActivity, toCamel };
