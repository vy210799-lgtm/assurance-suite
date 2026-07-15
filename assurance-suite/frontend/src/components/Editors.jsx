import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { C, emptyFromFields } from "../config";
import { FieldInput } from "./atoms";

// value/onChange based — used for single-object sections (risk assessment, report)
// that PUT the whole object back in one call.
export function ObjectEditor({ title, value, fields, onChange, readOnly }) {
  const v = value || emptyFromFields(fields);
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.slate }}>{title}</div>
      <div className="grid grid-cols-2 gap-2" style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10 }}>
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}>
            <div className="text-xs mb-1" style={{ color: "#8a8778" }}>{f.label}</div>
            {readOnly ? <div className="text-xs" style={{ color: C.ink }}>{v[f.key] || "—"}</div> : <FieldInput field={f} value={v[f.key]} onChange={(val) => onChange({ ...v, [f.key]: val })} small />}
          </div>
        ))}
      </div>
    </div>
  );
}

// items/onAdd/onUpdate/onRemove based — each row is its own API call, since
// each nested item is its own database row on the backend.
export function ListEditor({ title, items, fields, onAdd, onUpdate, onRemove, readOnly }) {
  const [draft, setDraft] = useState(emptyFromFields(fields));
  const submit = () => {
    if (!draft[fields[0].key]) return;
    onAdd(draft);
    setDraft(emptyFromFields(fields));
  };
  const cols = readOnly ? `repeat(${fields.length}, 1fr)` : `repeat(${fields.length}, 1fr) 28px`;
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.slate }}>{title} ({(items || []).length})</div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
        {(items || []).length === 0 && <div className="text-xs px-2 py-3" style={{ color: "#b8b4a6", background: "#fff" }}>None recorded.</div>}
        {(items || []).map((it) => (
          <div key={it.id} className="grid gap-2 items-center px-2 py-2" style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${C.line}`, background: "#fff" }}>
            {fields.map((f) => (
              readOnly
                ? <div key={f.key} className="text-xs truncate" style={{ color: C.ink }}>{it[f.key] || "—"}</div>
                : <FieldInput key={f.key} field={f} value={it[f.key]} onChange={(val) => onUpdate(it.id, { [f.key]: val })} small />
            ))}
            {!readOnly && <button onClick={() => onRemove(it.id)} className="flex items-center justify-center" style={{ color: C.seal }}><Trash2 size={14} /></button>}
          </div>
        ))}
        {!readOnly && (
          <div className="grid gap-2 items-center px-2 py-2" style={{ gridTemplateColumns: cols, background: C.paper }}>
            {fields.map((f) => (
              <FieldInput key={f.key} field={f} value={draft[f.key]} onChange={(val) => setDraft({ ...draft, [f.key]: val })} small />
            ))}
            <button onClick={submit} className="flex items-center justify-center" style={{ color: C.forest }}><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
