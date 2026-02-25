import { useState, useEffect, useRef, useCallback } from "react";
import { useTreeStore } from "@/store/tree-store";

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function LayoutsDropdown() {
  const layouts = useTreeStore((s) => s.layouts);
  const currentLayoutId = useTreeStore((s) => s.currentLayoutId);

  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [showBlankInput, setShowBlankInput] = useState(false);
  const [blankName, setBlankName] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const blankInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenamingId(null);
        setShowNewInput(false);
        setShowBlankInput(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Focus new layout input when it appears
  useEffect(() => {
    if (showNewInput && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [showNewInput]);

  // Focus blank layout input when it appears
  useEffect(() => {
    if (showBlankInput && blankInputRef.current) {
      blankInputRef.current.focus();
    }
  }, [showBlankInput]);

  const currentLayout = layouts.find((l) => l.id === currentLayoutId);
  const displayName = currentLayout?.name ?? "Default";

  const handleSwitch = useCallback((id: string) => {
    if (id === currentLayoutId) return;
    useTreeStore.getState().switchLayout(id);
    setOpen(false);
  }, [currentLayoutId]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    useTreeStore.getState().deleteLayout(id);
  }, []);

  const startRename = useCallback((id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      useTreeStore.getState().renameLayout(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue]);

  const commitNewLayout = useCallback(() => {
    const name = newName.trim();
    if (name) {
      useTreeStore.getState().saveCurrentAsLayout(name);
    }
    setNewName("");
    setShowNewInput(false);
  }, [newName]);

  const commitBlankLayout = useCallback(() => {
    const name = blankName.trim();
    if (name) {
      useTreeStore.getState().createBlankLayout(name);
      setOpen(false);
    }
    setBlankName("");
    setShowBlankInput(false);
  }, [blankName]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--border-color)",
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(74,158,255,0.08)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          if (!open) e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <span>{displayName}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 240,
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Layout list */}
          <div style={{ maxHeight: 300, overflowY: "auto", padding: "4px 0" }}>
            {layouts.map((layout) => {
              const isActive = layout.id === currentLayoutId;
              const isHovered = hoveredId === layout.id;
              const isRenaming = renamingId === layout.id;

              return (
                <div
                  key={layout.id}
                  onClick={() => handleSwitch(layout.id)}
                  onMouseEnter={() => setHoveredId(layout.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: isHovered ? "rgba(74,158,255,0.06)" : "transparent",
                    borderLeft: isActive
                      ? "3px solid var(--accent-blue)"
                      : "3px solid transparent",
                    transition: "background 0.1s ease",
                  }}
                >
                  {/* Name + timestamp */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--accent-blue)",
                          borderRadius: 4,
                          color: "var(--text-primary)",
                          fontSize: 13,
                          padding: "2px 6px",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {layout.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary, var(--text-secondary))",
                            opacity: 0.6,
                            marginTop: 1,
                          }}
                        >
                          {relativeTime(layout.lastModified)}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hover actions: rename + delete */}
                  {isHovered && !isRenaming && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={(e) => startRename(layout.id, layout.name, e)}
                        title="Rename"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "2px 4px",
                          borderRadius: 4,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--text-primary)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {"\u270E"}
                      </button>
                      <button
                        onClick={(e) => handleDelete(layout.id, e)}
                        title="Delete"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "2px 4px",
                          borderRadius: 4,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#f85149";
                          e.currentTarget.style.background = "rgba(248,81,73,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {"\u00D7"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {layouts.length === 0 && (
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                No saved layouts
              </div>
            )}
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: "var(--border-color)",
              margin: "0",
            }}
          />

          {/* Save as New Layout + New Blank Layout */}
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {showNewInput ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNewLayout();
                    if (e.key === "Escape") {
                      setShowNewInput(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Layout name"
                  style={{
                    flex: 1,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 4,
                    color: "var(--text-primary)",
                    fontSize: 13,
                    padding: "4px 8px",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-blue)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                />
                <button
                  onClick={commitNewLayout}
                  disabled={!newName.trim()}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: newName.trim()
                      ? "var(--accent-blue)"
                      : "var(--bg-secondary)",
                    border: "none",
                    color: newName.trim()
                      ? "#fff"
                      : "var(--text-secondary)",
                    cursor: newName.trim() ? "pointer" : "default",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewInput(true)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  background: "transparent",
                  border: "1px dashed var(--border-color)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                  e.currentTarget.style.color = "var(--accent-blue)";
                  e.currentTarget.style.background = "rgba(74,158,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Save as New Layout
              </button>
            )}

            {showBlankInput ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  ref={blankInputRef}
                  value={blankName}
                  onChange={(e) => setBlankName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitBlankLayout();
                    if (e.key === "Escape") {
                      setShowBlankInput(false);
                      setBlankName("");
                    }
                  }}
                  placeholder="Layout name"
                  style={{
                    flex: 1,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 4,
                    color: "var(--text-primary)",
                    fontSize: 13,
                    padding: "4px 8px",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-green, #3fb950)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                />
                <button
                  onClick={commitBlankLayout}
                  disabled={!blankName.trim()}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: blankName.trim()
                      ? "var(--accent-green, #3fb950)"
                      : "var(--bg-secondary)",
                    border: "none",
                    color: blankName.trim()
                      ? "#fff"
                      : "var(--text-secondary)",
                    cursor: blankName.trim() ? "pointer" : "default",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                  }}
                >
                  Create
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBlankInput(true)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  background: "transparent",
                  border: "1px dashed var(--border-color)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-green, #3fb950)";
                  e.currentTarget.style.color = "var(--accent-green, #3fb950)";
                  e.currentTarget.style.background = "rgba(63, 185, 80, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                + New Blank Layout
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
