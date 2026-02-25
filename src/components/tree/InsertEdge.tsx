import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useUiStore } from "@/store/ui-store";

export function InsertEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  source,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the create dialog with the source as parent — the new node
    // will be inserted between source and target
    useUiStore.getState().openCreateDialog(source);
  };

  return (
    <>
      {/* Invisible wider hit area for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: hovered ? "#4a9eff" : (style?.stroke ?? "#3a3a6a"),
          strokeWidth: hovered ? 2 : (style?.strokeWidth ?? 1.5),
          transition: "stroke 0.15s, stroke-width 0.15s",
        }}
        markerEnd={markerEnd}
      />
      {hovered && (
        <EdgeLabelRenderer>
          <button
            onClick={handleInsert}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid #4a9eff",
              background: "var(--bg-primary, #0d1117)",
              color: "#4a9eff",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              zIndex: 10,
              boxShadow: "0 2px 8px rgba(74, 158, 255, 0.3)",
              transition: "transform 0.1s ease",
            }}
            title="Insert node here"
          >
            +
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
