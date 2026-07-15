import { C } from "../config";
import { ROLES } from "../config";

export function Onboarding({ onSelect, dismissable, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: dismissable ? "rgba(31,36,33,0.45)" : C.paper }} onClick={dismissable ? onDismiss : undefined}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "100%", background: dismissable ? "#fff" : "transparent", borderRadius: 14, padding: dismissable ? 28 : 0 }}>
        <div className="text-center mb-6">
          <div className="text-lg font-semibold" style={{ color: C.ink }}>Welcome to the assurance suite</div>
          <div className="text-sm mt-1" style={{ color: C.slate }}>Choose your role to set up your workspace.</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(ROLES).map(([key, r]) => {
            const Icon = r.icon;
            return (
              <button key={key} onClick={() => onSelect(key)} className="text-left p-4 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
                <Icon size={18} style={{ color: C.seal, marginBottom: 8 }} />
                <div className="text-sm font-medium" style={{ color: C.ink }}>{r.label}</div>
                <div className="text-xs mt-1" style={{ color: "#9a978d" }}>{r.desc}</div>
                {r.readOnly && <div className="text-xs mt-2" style={{ color: C.amber }}>Read-only access</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
