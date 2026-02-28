import { memo, useState, useCallback, useRef, useEffect } from "react";
import { type NodeProps, NodeResizeControl } from "@xyflow/react";
import { useTreeStore } from "@/store/tree-store";

const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: "rgba(210, 153, 34, 0.15)", border: "rgba(210, 153, 34, 0.4)", text: "#d29922" },
  blue: { bg: "rgba(74, 158, 255, 0.15)", border: "rgba(74, 158, 255, 0.4)", text: "#4a9eff" },
  green: { bg: "rgba(63, 185, 80, 0.15)", border: "rgba(63, 185, 80, 0.4)", text: "#3fb950" },
  pink: { bg: "rgba(219, 97, 162, 0.15)", border: "rgba(219, 97, 162, 0.4)", text: "#db61a2" },
  purple: { bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.4)", text: "#8b5cf6" },
  orange: { bg: "rgba(240, 136, 62, 0.15)", border: "rgba(240, 136, 62, 0.4)", text: "#f0883e" },
};

function StickyNoteInner({ id, data }: NodeProps) {
  const auiNode = data.auiNode as { promptBody?: string; tags?: string[] } | undefined;
  const text = auiNode?.promptBody ?? "";
  const colorTag = auiNode?.tags?.find((t: string) => t.startsWith("color:"));
  const colorKey = colorTag?.slice(6) ?? "yellow";
  const colors = NOTE_COLORS[colorKey] ?? NOTE_COLORS.yellow;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (draft !== text) {
      useTreeStore.getState().updateNode(id, { promptBody: draft, lastModified: Date.now() });
      useTreeStore.getState().saveTreeMetadata();
    }
  }, [id, draft, text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraft(text);
      setEditing(false);
    }
    // Stop propagation so canvas shortcuts don't fire while typing
    e.stopPropagation();
  }, [text]);

  const cycleColor = useCallback(() => {
    const keys = Object.keys(NOTE_COLORS);
    const currentIdx = keys.indexOf(colorKey);
    const nextColor = keys[(currentIdx + 1) % keys.length];
    const currentTags = auiNode?.tags?.filter((t: string) => !t.startsWith("color:")) ?? [];
    useTreeStore.getState().updateNode(id, {
      tags: [...currentTags, `color:${nextColor}`],
      lastModified: Date.now(),
    });
    useTreeStore.getState().saveTreeMetadata();
  }, [id, colorKey, auiNode?.tags]);

  const handleDelete = useCallback(() => {
    useTreeStore.getState().removeNode(id);
    useTreeStore.getState().saveTreeMetadata();
  }, [id]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minWidth: 140,
        minHeight: 80,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "8px 10px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar: color dot + delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
        <button
          onClick={cycleColor}
          title="Change color"
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: colors.text,
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        />
        <button
          onClick={handleDelete}
          title="Delete note"
          style={{
            background: "none",
            border: "none",
            color: colors.text,
            cursor: "pointer",
            fontSize: 14,
            padding: "0 2px",
            lineHeight: 1,
            opacity: 0.6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            width: "100%",
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 13,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            padding: 0,
          }}
        />
      ) : (
        <div
          onDoubleClick={() => { setDraft(text); setEditing(true); }}
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-primary)",
            cursor: "text",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflow: "hidden",
            opacity: text ? 1 : 0.5,
          }}
        >
          {text || "Double-click to edit..."}
        </div>
      )}

      {/* Resize handle */}
      <NodeResizeControl
        minWidth={140}
        minHeight={80}
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: 10,
          height: 10,
          background: "transparent",
          border: "none",
          cursor: "nwse-resize",
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRight: `2px solid ${colors.border}`,
          borderBottom: `2px solid ${colors.border}`,
          opacity: 0.6,
        }} />
      </NodeResizeControl>
    </div>
  );
}

export const StickyNote = memo(StickyNoteInner);
