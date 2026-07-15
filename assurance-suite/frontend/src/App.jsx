import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Clock, X } from "lucide-react";
import { C, MODULES, ROLES, emptyFromFields } from "./config";
import { api } from "./api";
import { ModuleView } from "./components/ModuleView";
import { RecordModal } from "./components/RecordModal";
import { Dashboard } from "./components/Dashboard";
import { Onboarding } from "./components/Onboarding";

const ROLE_STORAGE_KEY = "assurance-suite-role";

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_STORAGE_KEY) || null);
  const [pickingRole, setPickingRole] = useState(false);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [recordsByModule, setRecordsByModule] = useState({});
  const [loadingModule, setLoadingModule] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [error, setError] = useState(null);

  const roleReadOnly = role ? !!ROLES[role]?.readOnly : false;
  const allowedModules = role ? (ROLES[role]?.modules || []) : Object.keys(MODULES);

  const loadModule = useCallback(async (moduleKey) => {
    setLoadingModule(true);
    setError(null);
    try {
      const data = await api.list(moduleKey);
      setRecordsByModule((prev) => ({ ...prev, [moduleKey]: data }));
    } catch (e) {
      setError(`Couldn't reach the API (${e.message}). Is the backend running on the configured VITE_API_URL?`);
    } finally {
      setLoadingModule(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try { setDashboardStats(await api.dashboard()); }
    catch (e) { setError(`Couldn't reach the API (${e.message}).`); }
  }, []);

  useEffect(() => {
    if (!role) return;
    if (activeModule === "dashboard") loadDashboard();
    else loadModule(activeModule);
  }, [activeModule, role, loadModule, loadDashboard]);

  // If the current tab isn't visible for the newly chosen role, fall back to dashboard.
  useEffect(() => {
    if (role && activeModule !== "dashboard" && !allowedModules.includes(activeModule)) setActiveModule("dashboard");
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRole = (key) => {
    localStorage.setItem(ROLE_STORAGE_KEY, key);
    setRole(key);
    setPickingRole(false);
    setActiveModule("dashboard");
  };

  const openAdd = (moduleKey) => setModal({ moduleKey, mode: "add", values: emptyFromFields(MODULES[moduleKey].fields) });
  const openEdit = (moduleKey, record) => setModal({ moduleKey, mode: "edit", values: { ...record } });
  const closeModal = () => setModal(null);

  const saveModal = async () => {
    const { moduleKey, mode, values } = modal;
    try {
      if (mode === "add") {
        const created = await api.create(moduleKey, values);
        setRecordsByModule((prev) => ({ ...prev, [moduleKey]: [created, ...(prev[moduleKey] || [])] }));
      } else {
        const updated = await api.update(moduleKey, values.id, values);
        setRecordsByModule((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((r) => (r.id === updated.id ? updated : r)) }));
      }
      setModal(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteRecord = async (moduleKey, record) => {
    try {
      await api.remove(moduleKey, record.id);
      setRecordsByModule((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).filter((r) => r.id !== record.id) }));
    } catch (e) {
      setError(e.message);
    }
  };

  const updateRecordInPlace = (moduleKey, id, updated) =>
    setRecordsByModule((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((r) => (r.id === id ? updated : r)) }));

  const toggleExpand = (moduleKey, id) =>
    setExpanded((prev) => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [id]: !prev[moduleKey]?.[id] } }));

  const openActivity = async () => {
    setShowActivity(true);
    try { setActivityLog(await api.activity()); } catch (e) { /* best effort */ }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, accent: C.ink },
    ...Object.entries(MODULES).filter(([key]) => allowedModules.includes(key)).map(([key, m]) => ({ key, label: m.label, icon: m.icon, accent: m.accent })),
  ];

  if (!role) return <Onboarding onSelect={selectRole} dismissable={false} />;

  return (
    <div style={{ background: C.paper, minHeight: "100vh" }} className="flex">
      <div style={{ width: 210, background: C.ink, flexShrink: 0 }} className="py-5 px-3">
        <div className="px-2 mb-6">
          <div className="text-sm font-semibold" style={{ color: "#fff" }}>Assurance suite</div>
          <div className="text-xs font-mono" style={{ color: "#8a8f86" }}>GRC control room</div>
        </div>
        <div className="space-y-1">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = activeModule === n.key;
            return (
              <button key={n.key} onClick={() => setActiveModule(n.key)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium" style={{ background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#fff" : "#b7bbb2", borderLeft: active ? `3px solid ${n.accent === C.ink ? "#fff" : n.accent}` : "3px solid transparent" }}>
                <Icon size={15} /> {n.label}
              </button>
            );
          })}
        </div>
        <div className="mt-6 px-2" style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
          <div className="text-xs mb-1" style={{ color: "#8a8f86" }}>Signed in as</div>
          <div className="text-xs font-medium mb-2" style={{ color: "#fff" }}>{ROLES[role]?.label}{roleReadOnly ? " (read-only)" : ""}</div>
          <button onClick={() => setPickingRole(true)} className="text-xs" style={{ color: "#b7bbb2", textDecoration: "underline" }}>Switch role</button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="text-sm font-medium" style={{ color: C.ink }}>{navItems.find((n) => n.key === activeModule)?.label}</div>
          <button onClick={openActivity} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded" style={{ border: `1px solid ${C.line}`, color: C.slate }}>
            <Clock size={13} /> Activity log
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="text-xs mb-4 px-3 py-2 rounded" style={{ background: "#fdecec", color: C.seal, border: `1px solid ${C.seal}` }}>
              {error} <button onClick={() => setError(null)} style={{ textDecoration: "underline", marginLeft: 6 }}>dismiss</button>
            </div>
          )}
          {activeModule === "dashboard" && <Dashboard stats={dashboardStats} role={role} goTo={setActiveModule} />}
          {activeModule !== "dashboard" && (
            loadingModule && !recordsByModule[activeModule] ? (
              <div className="text-xs" style={{ color: "#9a978d" }}>Loading…</div>
            ) : (
              <ModuleView
                moduleKey={activeModule}
                records={recordsByModule[activeModule] || []}
                expandedIds={expanded[activeModule] || {}}
                onToggle={(id) => toggleExpand(activeModule, id)}
                onAdd={() => openAdd(activeModule)}
                onEdit={(r) => openEdit(activeModule, r)}
                onDelete={(r) => deleteRecord(activeModule, r)}
                onRecordUpdate={(id, updated) => updateRecordInPlace(activeModule, id, updated)}
                readOnly={roleReadOnly}
              />
            )
          )}
        </div>
      </div>

      {showActivity && (
        <div className="fixed inset-0 z-40" style={{ background: "rgba(31,36,33,0.3)" }} onClick={() => setShowActivity(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full" style={{ width: 320, background: "#fff", borderLeft: `1px solid ${C.line}`, overflowY: "auto" }}>
            <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
              <div className="text-sm font-medium">Activity log</div>
              <button onClick={() => setShowActivity(false)}><X size={16} /></button>
            </div>
            {activityLog.length === 0 && <div className="text-xs px-4 py-6" style={{ color: "#b8b4a6" }}>Nothing recorded yet.</div>}
            {activityLog.map((a) => (
              <div key={a.id} className="px-4 py-3 text-xs" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div style={{ color: C.ink }}><span className="font-medium">{a.action}</span> · {a.module}</div>
                <div style={{ color: "#9a978d" }}>{a.detail}</div>
                <div style={{ color: "#c9c6ba" }}>{new Date(a.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pickingRole && <Onboarding onSelect={selectRole} dismissable={true} onDismiss={() => setPickingRole(false)} />}
      <RecordModal modal={modal} onChange={setModal} onClose={closeModal} onSave={saveModal} />
    </div>
  );
}
