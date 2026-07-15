const express = require("express");
const router = express.Router();
const { db, uid, nextId, logActivity } = require("../db");
const { loadTrustCenter } = require("../lib/trustCenter");
const { callClaude } = require("../lib/claude");

function serializeAudit(row) {
  if (!row) return null;
  const evidence = db.prepare("SELECT * FROM evidence WHERE audit_id = ? ORDER BY created_at").all(row.id).map((e) => ({
    id: e.id, name: e.name, type: e.type, collectedBy: e.collected_by, status: e.status,
    fileName: e.file_name, fileContent: e.file_content,
    chat: db.prepare("SELECT role, text FROM evidence_chat WHERE evidence_id = ? ORDER BY id").all(e.id),
  }));
  const findings = db.prepare("SELECT * FROM findings WHERE audit_id = ? ORDER BY rowid").all(row.id).map((f) => ({
    id: f.id, title: f.title, severity: f.severity, owner: f.owner, dueDate: f.due_date, status: f.status,
  }));
  return {
    id: row.id, title: row.title, area: row.area, type: row.type, riskRating: row.risk_rating, status: row.status,
    leadAuditor: row.lead_auditor, startDate: row.start_date, endDate: row.end_date,
    riskAssessment: { inherentRisk: row.ra_inherent_risk, residualRisk: row.ra_residual_risk, controlEffectiveness: row.ra_control_effectiveness, notes: row.ra_notes },
    report: { opinion: row.report_opinion, status: row.report_status, summary: row.report_summary },
    evidence, findings,
    trustCenter: loadTrustCenter("audits", row.id),
  };
}

router.get("/audits", (req, res) => {
  const rows = db.prepare("SELECT * FROM audits ORDER BY created_at DESC").all();
  res.json(rows.map(serializeAudit));
});

router.get("/audits/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Audit not found" });
  res.json(serializeAudit(row));
});

router.post("/audits", (req, res) => {
  const b = req.body || {};
  const id = nextId("audits", "IA");
  db.prepare(`INSERT INTO audits (id, title, area, type, risk_rating, status, lead_auditor, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, b.title || "", b.area || "", b.type || "", b.riskRating || "", b.status || "Planned", b.leadAuditor || "", b.startDate || "", b.endDate || "");
  logActivity("Internal audit", "Created", b.title || id);
  res.status(201).json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(id)));
});

router.put("/audits/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Audit not found" });
  db.prepare(`UPDATE audits SET title=?, area=?, type=?, risk_rating=?, status=?, lead_auditor=?, start_date=?, end_date=? WHERE id=?`)
    .run(b.title ?? existing.title, b.area ?? existing.area, b.type ?? existing.type, b.riskRating ?? existing.risk_rating, b.status ?? existing.status, b.leadAuditor ?? existing.lead_auditor, b.startDate ?? existing.start_date, b.endDate ?? existing.end_date, req.params.id);
  logActivity("Internal audit", "Updated", b.title || existing.title || req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id)));
});

router.delete("/audits/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Audit not found" });
  db.prepare("DELETE FROM audits WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM trust_centers WHERE module = 'audits' AND record_id = ?").run(req.params.id);
  logActivity("Internal audit", "Deleted", existing.title || req.params.id);
  res.status(204).end();
});

router.put("/audits/:id/risk-assessment", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Audit not found" });
  db.prepare("UPDATE audits SET ra_inherent_risk=?, ra_residual_risk=?, ra_control_effectiveness=?, ra_notes=? WHERE id=?")
    .run(b.inherentRisk ?? existing.ra_inherent_risk, b.residualRisk ?? existing.ra_residual_risk, b.controlEffectiveness ?? existing.ra_control_effectiveness, b.notes ?? existing.ra_notes, req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id)));
});

router.put("/audits/:id/report", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Audit not found" });
  db.prepare("UPDATE audits SET report_opinion=?, report_status=?, report_summary=? WHERE id=?")
    .run(b.opinion ?? existing.report_opinion, b.status ?? existing.report_status, b.summary ?? existing.report_summary, req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id)));
});

/* Evidence -------------------------------------------------------------- */

router.post("/audits/:id/evidence", (req, res) => {
  const b = req.body || {};
  const audit = db.prepare("SELECT id FROM audits WHERE id = ?").get(req.params.id);
  if (!audit) return res.status(404).json({ error: "Audit not found" });
  const id = uid();
  db.prepare(`INSERT INTO evidence (id, audit_id, name, type, collected_by, status, file_name, file_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.params.id, b.name || "", b.type || "Document", b.collectedBy || "", b.status || "Pending", b.fileName || "", (b.fileContent || "").slice(0, 12000));
  res.status(201).json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id)));
});

router.put("/evidence/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM evidence WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Evidence not found" });
  db.prepare("UPDATE evidence SET name=?, type=?, collected_by=?, status=? WHERE id=?")
    .run(b.name ?? existing.name, b.type ?? existing.type, b.collectedBy ?? existing.collected_by, b.status ?? existing.status, req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(existing.audit_id)));
});

router.delete("/evidence/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM evidence WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Evidence not found" });
  db.prepare("DELETE FROM evidence WHERE id = ?").run(req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(existing.audit_id)));
});

// AI assistant: answers questions using only the uploaded file's text content.
router.post("/evidence/:id/chat", async (req, res) => {
  const message = (req.body && req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "message is required" });
  const ev = db.prepare("SELECT * FROM evidence WHERE id = ?").get(req.params.id);
  if (!ev) return res.status(404).json({ error: "Evidence not found" });

  db.prepare("INSERT INTO evidence_chat (evidence_id, role, text) VALUES (?, 'user', ?)").run(ev.id, message);
  const history = db.prepare("SELECT role, text FROM evidence_chat WHERE evidence_id = ? ORDER BY id").all(ev.id);

  const sys = `You are an audit assistant reviewing one uploaded evidence file named "${ev.file_name || ev.name}". Answer only from the file content below; if the answer is not present, say the file does not contain that information. Be concise and factual.\n\nFILE CONTENT:\n${ev.file_content || "(no readable content — file may be a non-text format)"}`;
  try {
    const text = await callClaude(sys, history.map((m) => ({ role: m.role, content: m.text })));
    db.prepare("INSERT INTO evidence_chat (evidence_id, role, text) VALUES (?, 'assistant', ?)").run(ev.id, text);
  } catch (e) {
    db.prepare("INSERT INTO evidence_chat (evidence_id, role, text) VALUES (?, 'assistant', ?)").run(ev.id, `The assistant is unavailable: ${e.message}`);
  }
  const chat = db.prepare("SELECT role, text FROM evidence_chat WHERE evidence_id = ? ORDER BY id").all(ev.id);
  res.json({ chat });
});

/* Findings ---------------------------------------------------------------*/

router.post("/audits/:id/findings", (req, res) => {
  const b = req.body || {};
  const audit = db.prepare("SELECT id FROM audits WHERE id = ?").get(req.params.id);
  if (!audit) return res.status(404).json({ error: "Audit not found" });
  const id = uid();
  db.prepare("INSERT INTO findings (id, audit_id, title, severity, owner, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.params.id, b.title || "", b.severity || "", b.owner || "", b.dueDate || "", b.status || "Open");
  res.status(201).json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(req.params.id)));
});

router.put("/findings/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM findings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Finding not found" });
  db.prepare("UPDATE findings SET title=?, severity=?, owner=?, due_date=?, status=? WHERE id=?")
    .run(b.title ?? existing.title, b.severity ?? existing.severity, b.owner ?? existing.owner, b.dueDate ?? existing.due_date, b.status ?? existing.status, req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(existing.audit_id)));
});

router.delete("/findings/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM findings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Finding not found" });
  db.prepare("DELETE FROM findings WHERE id = ?").run(req.params.id);
  res.json(serializeAudit(db.prepare("SELECT * FROM audits WHERE id = ?").get(existing.audit_id)));
});

module.exports = router;
