import { useState } from "react";
import { useUiStore } from "@/store/ui-store";
import { useTreeStore } from "@/store/tree-store";

export function ValidationBanner() {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const nodes = useTreeStore((s) => s.nodes);
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (!selectedNodeId) return null;

  const node = nodes.get(selectedNodeId);
  if (!node || node.validationErrors.length === 0) return null;

  // Allow dismissing per-node
  if (dismissed === selectedNodeId) return null;

  return (
    <div
      style={{
        background: "rgba(248, 81, 73, 0.1)",
        border: "1px solid #f85149",
        padding: "8px 16px",
        borderRadius: 4,
        margin: "8px 8px 0 8px",
        position: "relative",
        fontSize: 13,
        lineHeight: "1.5",
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setDismissed(selectedNodeId)}
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "none",
          border: "none",
          color: "#f85149",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: "0 4px",
        }}
        aria-label="Dismiss validation errors"
      >
        x
      </button>

      <div
        style={{
          fontWeight: 600,
          color: "#f85149",
          marginBottom: 4,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Validation Errors — {node.name}
      </div>

      <ul style={{ margin: 0, paddingLeft: 18, color: "#e57373" }}>
        {node.validationErrors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
}
