const express = require("express");
const router = express.Router();
const { db, uid, nextId, logActivity } = require("../db");
const { loadTrustCenter } = require("../lib/trustCenter");

function serializePolicy(row) {
  if (!row) return null;
  const attestations = db.prepare("SELECT * FROM attestations WHERE policy_id = ? ORDER BY rowid").all(row.id).map((a) => ({
    id: a.id, name: a.name, acknowledged: a.acknowledged, date: a.date,
  }));
  return {
    id: row.id, title: row.title, category: row.category, owner: row.owner, version: row.version,
    effectiveDate: row.effective_date, reviewDate: row.review_date, status: row.status,
    attestations,
    trustCenter: loadTrustCenter("policies", row.id),
  };
}

router.get("/policies", (req, res) => res.json(db.prepare("SELECT * FROM policies ORDER BY created_at DESC").all().map(serializePolicy)));

router.get("/policies/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM policies WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Policy not found" });
  res.json(serializePolicy(row));
});

router.post("/policies", (req, res) => {
  const b = req.body || {};
  const id = nextId("policies", "PM");
  db.prepare(`INSERT INTO policies (id, title, category, owner, version, effective_date, review_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, b.title || "", b.category || "", b.owner || "", b.version || "", b.effectiveDate || "", b.reviewDate || "", b.status || "Draft");
  logActivity("Policy management", "Created", b.title || id);
  res.status(201).json(serializePolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(id)));
});

router.put("/policies/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM policies WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Policy not found" });
  db.prepare(`UPDATE policies SET title=?, category=?, owner=?, version=?, effective_date=?, review_date=?, status=? WHERE id=?`)
    .run(b.title ?? existing.title, b.category ?? existing.category, b.owner ?? existing.owner, b.version ?? existing.version, b.effectiveDate ?? existing.effective_date, b.reviewDate ?? existing.review_date, b.status ?? existing.status, req.params.id);
  logActivity("Policy management", "Updated", b.title || existing.title || req.params.id);
  res.json(serializePolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(req.params.id)));
});

router.delete("/policies/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM policies WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Policy not found" });
  db.prepare("DELETE FROM policies WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM trust_centers WHERE module = 'policies' AND record_id = ?").run(req.params.id);
  logActivity("Policy management", "Deleted", existing.title || req.params.id);
  res.status(204).end();
});

router.post("/policies/:id/attestations", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM policies WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Policy not found" });
  db.prepare("INSERT INTO attestations (id, policy_id, name, acknowledged, date) VALUES (?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.name || "", b.acknowledged || "No", b.date || "");
  res.status(201).json(serializePolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(req.params.id)));
});
router.put("/attestations/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM attestations WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE attestations SET name=?, acknowledged=?, date=? WHERE id=?")
    .run(b.name ?? existing.name, b.acknowledged ?? existing.acknowledged, b.date ?? existing.date, req.params.id);
  res.json(serializePolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(existing.policy_id)));
});
router.delete("/attestations/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM attestations WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM attestations WHERE id = ?").run(req.params.id);
  res.json(serializePolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(existing.policy_id)));
});

module.exports = router;
