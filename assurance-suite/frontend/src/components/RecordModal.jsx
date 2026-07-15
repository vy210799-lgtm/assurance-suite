import { X } from "lucide-react";
import { C, MODULES } from "../config";
import { FieldInput } from "./atoms";

export function RecordModal({ modal, onChange, onClose, onSave }) {
  if (!modal) return null;
  const meta = MODULES[modal.moduleKey];
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(31,36,33,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: 480, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="text-sm font-medium" style={{ color: C.ink }}>{modal.mode === "add" ? `New ${meta.label} record` : `Edit ${meta.label} record`}</div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          {meta.fields.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}>
              <div className="text-xs mb-1" style={{ color: "#8a8778" }}>{f.label}</div>
              <FieldInput field={f} value={modal.values[f.key]} onChange={(v) => onChange({ ...modal, values: { ...modal.values, [f.key]: v } })} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="text-xs px-3 py-2 rounded" style={{ border: `1px solid ${C.line}`, color: C.slate }}>Cancel</button>
          <button onClick={onSave} className="text-xs px-3 py-2 rounded font-medium" style={{ background: meta.accent, color: "#fff" }}>{modal.mode === "add" ? "Create record" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
