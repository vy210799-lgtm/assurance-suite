const express = require("express");
const router = express.Router();
const { db, uid, nextId, logActivity } = require("../db");

function serializeEngagement(row) {
  if (!row) return null;
  const pbc = db.prepare("SELECT * FROM pbc_items WHERE engagement_id = ? ORDER BY rowid").all(row.id).map((p) => ({
    id: p.id, item: p.item, dueDate: p.due_date, status: p.status, uploadedBy: p.uploaded_by,
  }));
  const queryLog = db.prepare("SELECT * FROM query_log WHERE engagement_id = ? ORDER BY rowid").all(row.id).map((q) => ({
    id: q.id, question: q.question, response: q.response, status: q.status,
  }));
  return {
    id: row.id, auditFirm: row.audit_firm, type: row.type, period: row.period, status: row.status,
    leadPartner: row.lead_partner, startDate: row.start_date, endDate: row.end_date,
    pbc, queryLog,
  };
}

router.get("/engagements", (req, res) => res.json(db.prepare("SELECT * FROM engagements ORDER BY created_at DESC").all().map(serializeEngagement)));

router.get("/engagements/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Engagement not found" });
  res.json(serializeEngagement(row));
});

router.post("/engagements", (req, res) => {
  const b = req.body || {};
  const id = nextId("engagements", "EA");
  db.prepare(`INSERT INTO engagements (id, audit_firm, type, period, status, lead_partner, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, b.auditFirm || "", b.type || "", b.period || "", b.status || "Planning", b.leadPartner || "", b.startDate || "", b.endDate || "");
  logActivity("External audit", "Created", b.auditFirm || id);
  res.status(201).json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(id)));
});

router.put("/engagements/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Engagement not found" });
  db.prepare(`UPDATE engagements SET audit_firm=?, type=?, period=?, status=?, lead_partner=?, start_date=?, end_date=? WHERE id=?`)
    .run(b.auditFirm ?? existing.audit_firm, b.type ?? existing.type, b.period ?? existing.period, b.status ?? existing.status, b.leadPartner ?? existing.lead_partner, b.startDate ?? existing.start_date, b.endDate ?? existing.end_date, req.params.id);
  logActivity("External audit", "Updated", b.auditFirm || existing.audit_firm || req.params.id);
  res.json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id)));
});

router.delete("/engagements/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Engagement not found" });
  db.prepare("DELETE FROM engagements WHERE id = ?").run(req.params.id);
  logActivity("External audit", "Deleted", existing.audit_firm || req.params.id);
  res.status(204).end();
});

router.post("/engagements/:id/pbc", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM engagements WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Engagement not found" });
  db.prepare("INSERT INTO pbc_items (id, engagement_id, item, due_date, status, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.item || "", b.dueDate || "", b.status || "Requested", b.uploadedBy || "");
  res.status(201).json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id)));
});
router.put("/pbc/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM pbc_items WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE pbc_items SET item=?, due_date=?, status=?, uploaded_by=? WHERE id=?")
    .run(b.item ?? existing.item, b.dueDate ?? existing.due_date, b.status ?? existing.status, b.uploadedBy ?? existing.uploaded_by, req.params.id);
  res.json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(existing.engagement_id)));
});
router.delete("/pbc/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM pbc_items WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM pbc_items WHERE id = ?").run(req.params.id);
  res.json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(existing.engagement_id)));
});

router.post("/engagements/:id/query-log", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM engagements WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Engagement not found" });
  db.prepare("INSERT INTO query_log (id, engagement_id, question, response, status) VALUES (?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.question || "", b.response || "", b.status || "Open");
  res.status(201).json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(req.params.id)));
});
router.put("/query-log/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM query_log WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE query_log SET question=?, response=?, status=? WHERE id=?")
    .run(b.question ?? existing.question, b.response ?? existing.response, b.status ?? existing.status, req.params.id);
  res.json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(existing.engagement_id)));
});
router.delete("/query-log/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM query_log WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM query_log WHERE id = ?").run(req.params.id);
  res.json(serializeEngagement(db.prepare("SELECT * FROM engagements WHERE id = ?").get(existing.engagement_id)));
});

module.exports = router;
