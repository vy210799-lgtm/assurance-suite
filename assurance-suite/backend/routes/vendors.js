const express = require("express");
const router = express.Router();
const { db, uid, nextId, logActivity } = require("../db");
const { loadTrustCenter } = require("../lib/trustCenter");

function serializeVendor(row) {
  if (!row) return null;
  const dueDiligence = db.prepare("SELECT * FROM due_diligence WHERE vendor_id = ? ORDER BY rowid").all(row.id).map((d) => ({
    id: d.id, document: d.document, status: d.status, expiryDate: d.expiry_date,
  }));
  const assessments = db.prepare("SELECT * FROM assessments WHERE vendor_id = ? ORDER BY rowid").all(row.id).map((a) => ({
    id: a.id, domain: a.domain, score: a.score, assessedBy: a.assessed_by, date: a.date,
  }));
  return {
    id: row.id, name: row.name, tier: row.tier, category: row.category, owner: row.owner,
    inherentRisk: row.inherent_risk, residualRisk: row.residual_risk, contractEnd: row.contract_end, monitoringStatus: row.monitoring_status,
    dueDiligence, assessments,
    trustCenter: loadTrustCenter("vendors", row.id),
  };
}

router.get("/vendors", (req, res) => res.json(db.prepare("SELECT * FROM vendors ORDER BY created_at DESC").all().map(serializeVendor)));

router.get("/vendors/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Vendor not found" });
  res.json(serializeVendor(row));
});

router.post("/vendors", (req, res) => {
  const b = req.body || {};
  const id = nextId("vendors", "TP");
  db.prepare(`INSERT INTO vendors (id, name, tier, category, owner, inherent_risk, residual_risk, contract_end, monitoring_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, b.name || "", b.tier || "", b.category || "", b.owner || "", b.inherentRisk || "", b.residualRisk || "", b.contractEnd || "", b.monitoringStatus || "Active");
  logActivity("TPRM", "Created", b.name || id);
  res.status(201).json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(id)));
});

router.put("/vendors/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Vendor not found" });
  db.prepare(`UPDATE vendors SET name=?, tier=?, category=?, owner=?, inherent_risk=?, residual_risk=?, contract_end=?, monitoring_status=? WHERE id=?`)
    .run(b.name ?? existing.name, b.tier ?? existing.tier, b.category ?? existing.category, b.owner ?? existing.owner, b.inherentRisk ?? existing.inherent_risk, b.residualRisk ?? existing.residual_risk, b.contractEnd ?? existing.contract_end, b.monitoringStatus ?? existing.monitoring_status, req.params.id);
  logActivity("TPRM", "Updated", b.name || existing.name || req.params.id);
  res.json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id)));
});

router.delete("/vendors/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Vendor not found" });
  db.prepare("DELETE FROM vendors WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM trust_centers WHERE module = 'vendors' AND record_id = ?").run(req.params.id);
  logActivity("TPRM", "Deleted", existing.name || req.params.id);
  res.status(204).end();
});

router.post("/vendors/:id/due-diligence", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM vendors WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Vendor not found" });
  db.prepare("INSERT INTO due_diligence (id, vendor_id, document, status, expiry_date) VALUES (?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.document || "", b.status || "", b.expiryDate || "");
  res.status(201).json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id)));
});
router.put("/due-diligence/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM due_diligence WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE due_diligence SET document=?, status=?, expiry_date=? WHERE id=?").run(b.document ?? existing.document, b.status ?? existing.status, b.expiryDate ?? existing.expiry_date, req.params.id);
  res.json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(existing.vendor_id)));
});
router.delete("/due-diligence/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM due_diligence WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM due_diligence WHERE id = ?").run(req.params.id);
  res.json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(existing.vendor_id)));
});

router.post("/vendors/:id/assessments", (req, res) => {
  const b = req.body || {};
  if (!db.prepare("SELECT id FROM vendors WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Vendor not found" });
  db.prepare("INSERT INTO assessments (id, vendor_id, domain, score, assessed_by, date) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid(), req.params.id, b.domain || "", b.score || "", b.assessedBy || "", b.date || "");
  res.status(201).json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(req.params.id)));
});
router.put("/assessments/:id", (req, res) => {
  const b = req.body || {};
  const existing = db.prepare("SELECT * FROM assessments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE assessments SET domain=?, score=?, assessed_by=?, date=? WHERE id=?").run(b.domain ?? existing.domain, b.score ?? existing.score, b.assessedBy ?? existing.assessed_by, b.date ?? existing.date, req.params.id);
  res.json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(existing.vendor_id)));
});
router.delete("/assessments/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM assessments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM assessments WHERE id = ?").run(req.params.id);
  res.json(serializeVendor(db.prepare("SELECT * FROM vendors WHERE id = ?").get(existing.vendor_id)));
});

module.exports = router;
