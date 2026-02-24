import { useEffect, useRef, useMemo } from "react";
import { useUiStore } from "@/store/ui-store";
import { useTreeStore } from "@/store/tree-store";

export function SearchBar() {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const collapsedGroups = useUiStore((s) => s.collapsedGroups);
  const collapseAllGroups = useUiStore((s) => s.collapseAllGroups);
  const expandAllGroups = useUiStore((s) => s.expandAllGroups);
  const nodes = useTreeStore((s) => s.nodes);
  const inputRef = useRef<HTMLInputElement>(null);

  const groupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, node] of nodes) {
      if (node.kind === "group") ids.add(id);
    }
    return ids;
  }, [nodes]);

  const allCollapsed = groupIds.size > 0 && groupIds.size === collapsedGroups.size;

  // Ctrl+F to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 10,
        background: "rgba(22, 33, 62, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(74, 158, 255, 0.15)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        pointerEvents: "auto",
      }}
    >
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes... (Ctrl+F)"
          style={{
            width: 180,
            padding: "5px 26px 5px 8px",
            background: "rgba(26, 26, 46, 0.6)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontSize: 12,
            outline: "none",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>

      {/* Collapse/Expand toggle */}
      {groupIds.size > 0 && (
        <button
          onClick={() => {
            if (allCollapsed) {
              expandAllGroups();
            } else {
              collapseAllGroups(groupIds);
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 11,
            padding: "3px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
          title={allCollapsed ? "Expand all teams" : "Collapse all teams"}
        >
          {allCollapsed ? "Expand" : "Collapse"}
        </button>
      )}
    </div>
  );
}
