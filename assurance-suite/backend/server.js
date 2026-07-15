require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./db"); // creates the SQLite schema on first run

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", require("./routes/audits"));
app.use("/api", require("./routes/vendors"));
app.use("/api", require("./routes/engagements"));
app.use("/api", require("./routes/controls"));
app.use("/api", require("./routes/policies"));
app.use("/api", require("./routes/trustCenter"));
app.use("/api", require("./routes/activity"));
app.use("/api", require("./routes/dashboard"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Assurance suite API listening on http://localhost:${PORT}`));
