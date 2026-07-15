import { useState } from "react";
import { Link2, RefreshCw, Unlink, CheckCircle2 } from "lucide-react";
import { C, hexA } from "../config";
import { FieldInput, Badge } from "./atoms";
import { api } from "../api";

export function TrustCenterSection({ moduleKey, recordId, trustCenter, onChange, readOnly }) {
  const tc = trustCenter || { connected: false, provider: "", portalUrl: "", lastSynced: null, documents: [], liveData: false };
  const [provider, setProvider] = useState(tc.provider || "");
  const [url, setUrl] = useState(tc.portalUrl || "");
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // matched doc | "notfound" | null
  const [fetching, setFetching] = useState(null);

  const base = `/trust-center/${moduleKey}/${recordId}`;

  const connect = async () => {
    if (!url.trim()) return;
    setSyncing(true);
    try { onChange(await api.post(`${base}/connect`, { provider, portalUrl: url })); }
    finally { setSyncing(false); }
  };
  const sync = async () => {
    setSyncing(true);
    try { onChange(await api.post(`${base}/sync`)); }
    finally { setSyncing(false); }
  };
  const disconnect = async () => onChange(await api.delete(base));

  const findDoc = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      setResult(await api.getPath(`${base}/find?q=${encodeURIComponent(query)}`));
    } catch (e) {
      setResult("notfound");
    } finally {
      setSearching(false);
    }
  };

  // Server proxies the actual bytes, so this works even when the vendor's
  // portal blocks the browser directly. If the server can't reach it either
  // (usually because the file needs an authenticated session), we fall back
  // to opening the source link so the person can finish the download there.
  const downloadDoc = async (doc) => {
    if (!doc.url) return;
    setFetching(doc.name);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}${base}/documents/${doc.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
    } catch (e) { /* fall through to opening the source link */ }
    window.open(doc.url, "_blank");
    setFetching(null);
  };

  return (
    <div className="mb-1">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.slate }}>Trust center (read-only)</div>
      <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10 }}>
        {!tc.connected ? (
          readOnly ? (
            <div className="text-xs" style={{ color: "#9a978d" }}>Not connected — ask someone with edit access to connect a trust center feed.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <div className="text-xs mb-1" style={{ color: "#8a8778" }}>Provider</div>
                <FieldInput field={{ type: "select", options: ["SafeBase", "Vanta", "Whistic", "Drata", "Custom endpoint"] }} value={provider} onChange={setProvider} small />
              </div>
              <div className="col-span-2">
                <div className="text-xs mb-1" style={{ color: "#8a8778" }}>Trust center URL / JSON endpoint</div>
                <FieldInput field={{ type: "text", label: "https://trust.vendor.com" }} value={url} onChange={setUrl} small />
              </div>
              <button onClick={connect} disabled={syncing} className="col-span-3 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded" style={{ background: hexA(C.slate, "1A"), color: C.slate, border: `1px solid ${hexA(C.slate, "40")}` }}>
                <Link2 size={13} /> {syncing ? "Connecting…" : "Connect and fetch (read-only)"}
              </button>
            </div>
          )
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs" style={{ color: C.slate }}>
                <CheckCircle2 size={13} style={{ display: "inline", marginRight: 4, color: C.forest }} />
                Connected to <span className="font-medium">{tc.provider || "trust center"}</span> · last synced {tc.lastSynced ? new Date(tc.lastSynced).toLocaleString() : "—"}
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <button onClick={sync} disabled={syncing} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: C.slate, border: `1px solid ${C.line}` }}><RefreshCw size={12} /> Sync</button>
                  <button onClick={disconnect} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: C.seal, border: `1px solid ${C.line}` }}><Unlink size={12} /> Disconnect</button>
                </div>
              )}
            </div>
            {!tc.liveData && (
              <div className="text-xs mb-2 px-2 py-1.5 rounded" style={{ background: hexA(C.amber, "15"), color: C.amber }}>
                Showing placeholder data with no source links — point this at an endpoint returning {"{ documents: [{ name, type, status, updatedDate, url }] }"} to enable real one-click downloads below.
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findDoc()} placeholder='Ask for a document, e.g. "SOC 2 report"' style={{ flex: 1, fontSize: 12, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 6 }} />
              <button onClick={findDoc} disabled={searching} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-medium" style={{ background: hexA(C.plum, "1A"), color: C.plum, border: `1px solid ${hexA(C.plum, "40")}` }}>
                {searching ? "Looking…" : "Find & fetch"}
              </button>
            </div>
            {result === "notfound" && (
              <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ background: hexA(C.seal, "12"), color: C.seal }}>
                No document matching "{query}" in the synced list. Try Sync again or check the exact name.
              </div>
            )}
            {result && result !== "notfound" && (
              <div className="flex items-center justify-between text-xs mb-3 px-2 py-1.5 rounded" style={{ background: hexA(C.forest, "12"), color: C.forest }}>
                <span>Found "{result.name}" — {result.updatedDate}</span>
                <button onClick={() => downloadDoc(result)} disabled={!result.url || fetching === result.name} className="flex items-center gap-1 font-medium px-2 py-1 rounded" style={{ color: C.forest, border: `1px solid ${hexA(C.forest, "40")}` }}>
                  {fetching === result.name ? "Fetching…" : "Download"}
                </button>
              </div>
            )}

            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "#8a8778", textAlign: "left" }}>
                  <th className="font-medium pb-1">Document</th>
                  <th className="font-medium pb-1">Type</th>
                  <th className="font-medium pb-1">Status</th>
                  <th className="font-medium pb-1">Updated</th>
                  <th className="font-medium pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {tc.documents.map((d) => (
                  <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="py-1.5">{d.name}</td>
                    <td className="py-1.5">{d.type}</td>
                    <td className="py-1.5"><Badge value={d.status} /></td>
                    <td className="py-1.5">{d.updatedDate}</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => downloadDoc(d)} disabled={!d.url || fetching === d.name} title={d.url ? "Download a copy" : "No source link synced for this document"} className="flex items-center gap-1 ml-auto" style={{ color: d.url ? C.slate : "#c9c6ba" }}>
                        <Link2 size={12} /> {fetching === d.name ? "…" : "Get copy"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
