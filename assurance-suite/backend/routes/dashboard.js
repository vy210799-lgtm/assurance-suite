const express = require("express");
const router = express.Router();
const { db } = require("../db");

router.get("/dashboard", (req, res) => {
  const openAudits = db.prepare("SELECT COUNT(*) n FROM audits WHERE status != 'Closed'").get().n;

  const vendorAlerts = db.prepare("SELECT id, name, tier FROM vendors WHERE monitoring_status = 'Alert'").all();

  const overdueFindings = db.prepare(`
    SELECT f.id, f.title, f.owner, f.due_date FROM findings f
    WHERE f.status != 'Closed' AND f.due_date != '' AND f.due_date < date('now')
  `).all();

  const overduePbc = db.prepare(`
    SELECT p.id, p.item, p.due_date FROM pbc_items p
    WHERE p.status != 'Received' AND p.due_date != '' AND p.due_date < date('now')
  `).all();

  const testStats = db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN result = 'Effective' THEN 1 ELSE 0 END) effective
    FROM tests`).get();
  const passRate = testStats.total ? Math.round((testStats.effective / testStats.total) * 100) : null;

  const policiesDue = db.prepare(`
    SELECT id, title, review_date FROM policies
    WHERE review_date != '' AND review_date >= date('now') AND review_date <= date('now', '+30 days')
  `).all();

  const attention = [
    ...overdueFindings.map((f) => ({ mod: "audits", label: `Finding overdue: ${f.title}`, sub: `Owner ${f.owner || "unassigned"} · was due ${f.due_date}` })),
    ...overduePbc.map((p) => ({ mod: "engagements", label: `Request overdue: ${p.item}`, sub: `Was due ${p.due_date}` })),
    ...vendorAlerts.map((v) => ({ mod: "vendors", label: `Vendor on alert: ${v.name}`, sub: `Tier ${v.tier || "—"}` })),
    ...policiesDue.map((p) => ({ mod: "policies", label: `Policy review due: ${p.title}`, sub: `Due ${p.review_date}` })),
  ].slice(0, 12);

  res.json({
    openAudits,
    vendorAlertCount: vendorAlerts.length,
    overduePbcCount: overduePbc.length,
    passRate,
    policiesDueCount: policiesDue.length,
    attention,
  });
});

module.exports = router;
