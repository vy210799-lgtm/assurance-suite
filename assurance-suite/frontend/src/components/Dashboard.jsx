import { AlertTriangle } from "lucide-react";
import { C, ROLES } from "../config";

export function Dashboard({ stats, role, goTo }) {
  if (!stats) return <div className="text-xs" style={{ color: "#9a978d" }}>Loading dashboard…</div>;
  const allowed = ROLES[role]?.modules || ["audits", "vendors", "engagements", "controls", "policies"];

  const cards = [
    { label: "Open audits", value: stats.openAudits, accent: C.seal, go: "audits" },
    { label: "Vendors on watch", value: stats.vendorAlertCount, accent: C.slate, go: "vendors" },
    { label: "Open external requests", value: stats.overduePbcCount, accent: C.umber, go: "engagements" },
    { label: "Control pass rate", value: stats.passRate === null ? "—" : `${stats.passRate}%`, accent: C.forest, go: "controls" },
    { label: "Policies due (30d)", value: stats.policiesDueCount, accent: C.plum, go: "policies" },
  ].filter((c) => allowed.includes(c.go));

  const attention = (stats.attention || []).filter((a) => allowed.includes(a.mod));

  return (
    <div>
      <div className="text-sm mb-4" style={{ color: C.slate }}>Welcome back, {ROLES[role]?.label || "there"}.</div>
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${Math.max(cards.length, 1)}, 1fr)` }}>
        {cards.map((c) => (
          <button key={c.label} onClick={() => goTo(c.go)} className="text-left p-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.line}`, borderTop: `3px solid ${c.accent}` }}>
            <div className="text-xs mb-1" style={{ color: "#8a8778" }}>{c.label}</div>
            <div className="text-xl font-medium font-mono" style={{ color: C.ink }}>{c.value}</div>
          </button>
        ))}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.slate }}>Needs attention</div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
        {attention.length === 0 && <div className="text-xs px-3 py-6 text-center" style={{ color: "#b8b4a6" }}>Nothing overdue right now.</div>}
        {attention.map((a, i) => (
          <button key={i} onClick={() => goTo(a.mod)} className="w-full text-left flex items-center gap-3 px-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.line}` : "none", background: "#fff" }}>
            <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0 }} />
            <div>
              <div className="text-xs font-medium" style={{ color: C.ink }}>{a.label}</div>
              <div className="text-xs" style={{ color: "#9a978d" }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
