import { C, hexA, statusHex } from "../config";

export function FieldInput({ field, value, onChange, small }) {
  const base = { width: "100%", fontSize: small ? 12 : 13, padding: small ? "5px 6px" : "7px 9px", border: `1px solid ${C.line}`, borderRadius: 6, background: "#fff", color: C.ink };
  if (field.type === "select")
    return (
      <select style={base} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  if (field.type === "date") return <input type="date" style={base} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "textarea") return <textarea rows={3} style={{ ...base, resize: "vertical" }} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  return <input type="text" style={base} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.label} />;
}

export function Badge({ value }) {
  if (!value) return <span className="text-xs" style={{ color: "#9a978d" }}>—</span>;
  const hex = statusHex(value);
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: hexA(hex, "1A"), color: hex, border: `1px solid ${hexA(hex, "40")}` }}>
      {value}
    </span>
  );
}
