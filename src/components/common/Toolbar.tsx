import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";

const buttonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  background: "transparent",
  border: "1px solid transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  transition: "all 0.15s ease",
};

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(74,158,255,0.08)";
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {label}
    </button>
  );
}

export function Toolbar() {
  const nodeCount = useTreeStore((s) => s.nodes.size);
  const toggleContextHub = useUiStore((s) => s.toggleContextHub);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const toggleSchedule = useUiStore((s) => s.toggleSchedule);

  return (
    <header
      style={{
        height: 48,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        flexShrink: 0,
        justifyContent: "space-between",
      }}
    >
      {/* Left: logo + subtitle */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--accent-blue)",
            letterSpacing: "0.05em",
          }}
        >
          AUI
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          Agent UI
        </span>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
        <ToolbarButton
          label="+"
          onClick={() => useUiStore.getState().openCreateDialog()}
        />
        <ToolbarButton label="Settings" onClick={toggleSettings} />
        <ToolbarButton label="Schedules" onClick={toggleSchedule} />
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-color)",
            margin: "0 4px",
          }}
        />
        <ToolbarButton label="Catalog" onClick={toggleContextHub} />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary, var(--text-secondary))",
            marginLeft: 8,
            whiteSpace: "nowrap",
          }}
        >
          {nodeCount} nodes
        </span>
      </div>
    </header>
  );
}
