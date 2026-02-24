import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        background: "#1e1e3a",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        padding: "4px 0",
        zIndex: 9999,
        minWidth: 160,
      }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div
            key={i}
            style={{
              height: 1,
              background: "var(--border-color)",
              margin: "4px 0",
            }}
          />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 16px",
              background: "transparent",
              border: "none",
              color: item.danger ? "#f85149" : "var(--text-primary)",
              fontSize: 13,
              textAlign: "left",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(74,158,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
