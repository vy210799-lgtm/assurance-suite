import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { C, MODULES } from "../config";
import { Badge } from "./atoms";
import { ExpandedContent } from "./ExpandedContent";

export function ModuleView({ moduleKey, records, expandedIds, onToggle, onAdd, onEdit, onDelete, onRecordUpdate, readOnly }) {
  const meta = MODULES[moduleKey];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-medium" style={{ color: C.ink }}>{meta.label}</div>
          <div className="text-xs" style={{ color: "#9a978d" }}>{records.length} record{records.length === 1 ? "" : "s"}</div>
        </div>
        {!readOnly && (
          <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded" style={{ background: meta.accent, color: "#fff" }}>
            <Plus size={14} /> New {meta.code}
          </button>
        )}
      </div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
        <div className="grid text-xs font-medium px-3 py-2" style={{ gridTemplateColumns: `90px repeat(${meta.columns.length}, 1fr) 70px`, background: C.paper, color: "#8a8778" }}>
          <div>ID</div>
          {meta.columns.map((c) => <div key={c}>{meta.fields.find((f) => f.key === c)?.label}</div>)}
          <div></div>
        </div>
        {records.length === 0 && <div className="text-xs px-3 py-6 text-center" style={{ color: "#b8b4a6" }}>No records yet{readOnly ? "." : " — add the first one."}</div>}
        {records.map((r) => {
          const open = !!expandedIds[r.id];
          return (
            <div key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="grid items-center px-3 py-2 text-xs cursor-pointer" style={{ gridTemplateColumns: `90px repeat(${meta.columns.length}, 1fr) 70px`, background: "#fff", borderLeft: `3px solid ${meta.accent}` }} onClick={() => onToggle(r.id)}>
                <div className="font-mono" style={{ color: "#9a978d" }}>{r.id}</div>
                {meta.columns.map((c) => {
                  const isStatusLike = ["status", "riskRating", "inherentRisk", "residualRisk", "monitoringStatus"].includes(c);
                  return <div key={c} className="truncate pr-2">{isStatusLike ? <Badge value={r[c]} /> : (r[c] || "—")}</div>;
                })}
                <div className="flex items-center gap-2 justify-end">
                  {!readOnly && <button onClick={(e) => { e.stopPropagation(); onEdit(r); }} className="text-xs" style={{ color: C.slate }}>Edit</button>}
                  {!readOnly && <button onClick={(e) => { e.stopPropagation(); onDelete(r); }} style={{ color: C.seal }}><Trash2 size={13} /></button>}
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </div>
              {open && (
                <div className="px-3 pt-3 pb-1" style={{ background: "#FBFAF7", borderTop: `1px solid ${C.line}` }}>
                  <ExpandedContent moduleKey={moduleKey} record={r} onRecordUpdate={(updated) => onRecordUpdate(r.id, updated)} readOnly={readOnly} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
