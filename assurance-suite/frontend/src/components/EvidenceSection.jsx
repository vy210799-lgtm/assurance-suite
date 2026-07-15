import { useState, useRef } from "react";
import { Plus, Trash2, Paperclip, Bot, Send } from "lucide-react";
import { C, hexA } from "../config";
import { FieldInput, Badge } from "./atoms";
import { api } from "../api";

export function EvidenceSection({ auditId, items, onRecordUpdate, readOnly }) {
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState("Document");
  const [draftFile, setDraftFile] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [chats, setChats] = useState({}); // { evidenceId: [{role,text}] } — local view of chat, seeded from item.chat
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setDraftFile({ name: f.name, content: String(reader.result).slice(0, 12000) });
    reader.onerror = () => setDraftFile({ name: f.name, content: "" });
    reader.readAsText(f);
  };

  const add = async () => {
    if (!draftName.trim()) return;
    const updated = await api.post(`/audits/${auditId}/evidence`, {
      name: draftName, type: draftType, fileName: draftFile ? draftFile.name : "", fileContent: draftFile ? draftFile.content : "",
    });
    onRecordUpdate(updated);
    setDraftName(""); setDraftFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const patch = async (id, p) => onRecordUpdate(await api.put(`/evidence/${id}`, p));
  const remove = async (id) => onRecordUpdate(await api.delete(`/evidence/${id}`));

  const chatFor = (item) => chats[item.id] ?? item.chat ?? [];

  const send = async (item) => {
    if (!chatInput.trim() || busy) return;
    const optimistic = [...chatFor(item), { role: "user", text: chatInput }];
    setChats((c) => ({ ...c, [item.id]: optimistic }));
    const msg = chatInput;
    setChatInput("");
    setBusy(true);
    try {
      const { chat } = await api.post(`/evidence/${item.id}/chat`, { message: msg });
      setChats((c) => ({ ...c, [item.id]: chat }));
    } catch (e) {
      setChats((c) => ({ ...c, [item.id]: [...optimistic, { role: "assistant", text: `The assistant is unavailable: ${e.message}` }] }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.slate }}>Evidence ({(items || []).length})</div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
        {(items || []).map((it) => (
          <div key={it.id} style={{ borderBottom: `1px solid ${C.line}`, background: "#fff" }}>
            <div className="grid gap-2 items-center px-2 py-2" style={{ gridTemplateColumns: readOnly ? "1.3fr 1fr 1fr 1fr auto auto" : "1.3fr 1fr 1fr 1fr auto auto auto" }}>
              {readOnly ? <div className="text-xs truncate" style={{ color: C.ink }}>{it.name}</div> : <FieldInput field={{ type: "text", label: "Name" }} value={it.name} onChange={(v) => patch(it.id, { name: v })} small />}
              {readOnly ? <div className="text-xs">{it.type}</div> : <FieldInput field={{ type: "select", options: ["Document", "Screenshot", "Interview note", "System extract"] }} value={it.type} onChange={(v) => patch(it.id, { type: v })} small />}
              {readOnly ? <div className="text-xs">{it.collectedBy || "—"}</div> : <FieldInput field={{ type: "text", label: "Collected by" }} value={it.collectedBy} onChange={(v) => patch(it.id, { collectedBy: v })} small />}
              {readOnly ? <Badge value={it.status} /> : <FieldInput field={{ type: "select", options: ["Pending", "Reviewed", "Approved"] }} value={it.status} onChange={(v) => patch(it.id, { status: v })} small />}
              <div className="text-xs truncate" style={{ maxWidth: 90, color: it.fileName ? C.slate : "#b8b4a6" }} title={it.fileName || "no file"}>
                {it.fileName ? <><Paperclip size={11} style={{ display: "inline", marginRight: 3 }} />{it.fileName}</> : "no file"}
              </div>
              <button disabled={!it.fileContent} onClick={() => setOpenChat(openChat === it.id ? null : it.id)} title="Ask AI about this file" style={{ color: it.fileContent ? C.plum : "#c9c6ba" }}><Bot size={16} /></button>
              {!readOnly && <button onClick={() => remove(it.id)} style={{ color: C.seal }}><Trash2 size={14} /></button>}
            </div>
            {openChat === it.id && (
              <div className="px-3 pb-3">
                <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 8 }}>
                  <div className="space-y-2 mb-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                    {chatFor(it).length === 0 && <div className="text-xs" style={{ color: "#9a978d" }}>Ask what's inside this file — e.g. "summarize this" or "does this mention encryption?"</div>}
                    {chatFor(it).map((m, i) => (
                      <div key={i} className="text-xs px-2 py-1.5 rounded" style={{ background: m.role === "user" ? "#fff" : hexA(C.plum, "12"), border: `1px solid ${C.line}`, maxWidth: "90%", marginLeft: m.role === "user" ? 0 : "auto" }}>
                        <span className="font-medium" style={{ color: m.role === "user" ? C.slate : C.plum }}>{m.role === "user" ? "You" : "Assistant"}: </span>{m.text}
                      </div>
                    ))}
                    {busy && <div className="text-xs" style={{ color: "#9a978d" }}>Reading the file…</div>}
                  </div>
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(it)} placeholder="Ask about this file..." style={{ flex: 1, fontSize: 12, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 6 }} />
                    <button onClick={() => send(it)} disabled={busy} style={{ color: C.plum }}><Send size={15} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {!readOnly && (
          <div className="grid gap-2 items-center px-2 py-2" style={{ gridTemplateColumns: "1.3fr 1fr 1.4fr auto", background: C.paper }}>
            <FieldInput field={{ type: "text", label: "Name" }} value={draftName} onChange={setDraftName} small />
            <FieldInput field={{ type: "select", options: ["Document", "Screenshot", "Interview note", "System extract"] }} value={draftType} onChange={setDraftType} small />
            <input ref={fileRef} type="file" onChange={handleFile} className="text-xs" style={{ fontSize: 11 }} />
            <button onClick={add} style={{ color: C.forest }}><Plus size={16} /></button>
          </div>
        )}
        {draftFile && <div className="text-xs px-2 pb-2" style={{ color: C.slate }}>Loaded "{draftFile.name}" — text content will be attached for AI review.</div>}
      </div>
      <div className="text-xs mt-1" style={{ color: "#9a978d" }}>File content is read in-browser as text (works best for .txt, .csv, .json, .md, .log files) and sent to the server only when you ask the assistant a question.</div>
    </div>
  );
}
