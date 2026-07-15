const express = require("express");
const router = express.Router();
const { db, uid, nextId, logActivity } = require("../db");
const { loadTrustCenter } = require("../lib/trustCenter");

function serializeControl(row) {
  if (!row) return null;
  const tests = db.prepare("SELECT * FROM tests WHERE control_id = ? ORDER BY rowid").all(row.id).map((t) => ({
    id: t.id, period: t.period, sampleSize: t.sample_size, result: t.result, exceptions: t.exceptions, tester: t.tester, date: t.date,
  }));
  return {
    id: row.id, name: row.name, process: row.process, type: row.type, automation: row.automation, frequency: row.frequency, owner: row.owner,
    tests,
    trustCenter: loadTrustCenter("controls", row.id),
  };
}

router.get("/controls", (req, res) => res.json(db.prepare("SELECT * FROM controls ORDER BY created_at DESC").all().map(serializeControl)));

router.get("/controls/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM controls WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Control not found" });
  res.json(serializeControl(row));
});

router.post("/controls", (req, res) => {
  const b = req.body || {};
  const id = nextId("controls", "CT");
  db.prepare(`INSERT INTO controls (id, name, process, type, automation, frequency, owner) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, b.name || "", b.process || "", b.type || "", b.automation || "", b.frequency || "", b.owner || "");
  logActivity("Control testing", "Created", b.name || id);
  res.status(201).json(serializeControl(db.prepare("SELECT * FROM controls WHERE id = ?").get(id)));
});

router.put("/controls/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM controls WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Control not found" });
  db.prepare(`UPDATE controls SET name=?, process=?, type=?, automation=?, frequency=?, owner=? WHERE id=?`)
    .run(b.name ?? existing.name, b.process ?? existing.process, b.type ?? existing.type, b.automation ?? existing.automation, b.frequency ?? existing.frequency, b.owner ?? existing.owner, req.params.id);
  logActivity("Control testing", "Updated", b.name || existing.name || req.params.id);
  res.json(serializeControl(db.prepare("SELECT * FROM controls WHERE id = ?").get(req.params.id)));
});

router.delete("/controls/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM controls WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Control not found" });
  db.prepare("DELETE FROM controls WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM trust_centers WHERE module = 'controls' AND record_id = ?").run(req.params.id);
  logActivity("Control testing", "Deleted", existing.name || req.params.id);
  res.status(204).end();
});

router.post("/controls/:id/tests", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM controls WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Control not found" });
  db.prepare("INSERT INTO tests (id, control_id, period, sample_size, result, exceptions, tester, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.period || "", b.sampleSize || "", b.result || "", b.exceptions || "", b.tester || "", b.date || "");
  res.status(201).json(serializeControl(db.prepare("SELECT * FROM controls WHERE id = ?").get(req.params.id)));
});
router.put("/tests/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM tests WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE tests SET period=?, sample_size=?, result=?, exceptions=?, tester=?, date=? WHERE id=?")
    .run(b.period ?? existing.period, b.sampleSize ?? existing.sample_size, b.result ?? existing.result, b.exceptions ?? existing.exceptions, b.tester ?? existing.tester, b.date ?? existing.date, req.params.id);
  res.json(serializeControl(db.prepare("SELECT * FROM controls WHERE id = ?").get(existing.control_id)));
});
router.delete("/tests/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM tests WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM tests WHERE id = ?").run(req.params.id);
  res.json(serializeControl(db.prepare("SELECT * FROM controls WHERE id = ?").get(existing.control_id)));
});

module.exports = router;
