import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";

const buttonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "transparent",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  transition: "background 0.15s, color 0.15s",
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
        e.currentTarget.style.background = "rgba(74,158,255,0.1)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
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
      {/* Left: logo */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--accent-blue)",
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}
      >
        AUI
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
        <ToolbarButton
          label="+"
          onClick={() => useUiStore.getState().openCreateDialog()}
        />
        <ToolbarButton label="Menu" onClick={toggleContextHub} />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
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
