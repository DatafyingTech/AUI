import { useEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  children?: ContextMenuItem[];
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const menuStyle: React.CSSProperties = {
  background: "#1e1e3a",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  padding: "4px 0",
  zIndex: 9999,
  minWidth: 160,
};

const itemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 16px",
  background: "transparent",
  border: "none",
  color: "var(--text-primary)",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.12s",
};

function SubMenu({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={rowRef}
      style={{ position: "relative" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        style={{
          ...itemStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(74,158,255,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {item.label}
        <span style={{ marginLeft: 12, opacity: 0.5, fontSize: 10 }}>&#9654;</span>
      </button>

      {open && item.children && item.children.length > 0 && (
        <div
          style={{
            ...menuStyle,
            position: "absolute",
            top: 0,
            left: "100%",
            marginLeft: 2,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {item.children.map((child, i) =>
            child.divider ? (
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
                  child.onClick();
                  onClose();
                }}
                style={{
                  ...itemStyle,
                  color: child.danger ? "#f85149" : "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(74,158,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {child.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
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
        ...menuStyle,
        position: "fixed",
        top: y,
        left: x,
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
        ) : item.children ? (
          <SubMenu key={i} item={item} onClose={onClose} />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              ...itemStyle,
              color: item.danger ? "#f85149" : "var(--text-primary)",
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
