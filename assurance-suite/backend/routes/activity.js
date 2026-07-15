const express = require("express");
const router = express.Router();
const { db } = require("../db");

router.get("/activity", (req, res) => {
  const rows = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 200").all();
  res.json(rows.map((r) => ({ id: r.id, module: r.module, action: r.action, detail: r.detail, time: r.time })));
});

module.exports = router;
