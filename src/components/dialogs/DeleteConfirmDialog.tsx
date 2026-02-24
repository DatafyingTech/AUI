import { useEffect } from "react";

interface DeleteConfirmDialogProps {
  open: boolean;
  nodeName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, nodeName, onClose, onConfirm }: DeleteConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 360,
          background: "#1e1e3a",
          borderRadius: 12,
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 24 }}>&#9888;</div>
        <h2 style={{ margin: "0 0 8px", color: "var(--text-primary)", fontSize: 18 }}>
          Delete {nodeName}?
        </h2>
        <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
          This will permanently remove the file from disk. This action cannot be undone.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              background: "#f85149",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
