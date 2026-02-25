import { useState, type CSSProperties } from "react";
import type { NodeVariable, VariableKind } from "@/types/aui-node";

const inputStyle: CSSProperties = {
  background: "var(--bg-primary, #0d1117)",
  border: "1px solid var(--border-color, #21262d)",
  color: "var(--text-primary, #e6edf3)",
  padding: 8,
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box" as const,
  width: "100%",
};

const VARIABLE_KINDS: { value: VariableKind; label: string; icon: string }[] = [
  { value: "text", label: "Text", icon: "Aa" },
  { value: "api-key", label: "API Key", icon: "\uD83D\uDD11" },
  { value: "password", label: "Password", icon: "\uD83D\uDD12" },
  { value: "note", label: "Note", icon: "\uD83D\uDCDD" },
];

const kindColors: Record<VariableKind, string> = {
  text: "var(--text-secondary)",
  "api-key": "#f0883e",
  password: "#f85149",
  note: "#8b5cf6",
};

interface VariableEditorProps {
  variables: NodeVariable[];
  onChange: (variables: NodeVariable[]) => void;
  accentColor?: string;
}

function MaskedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{ position: "relative", flex: 2 }}>
      <input
        type={revealed ? "text" : "password"}
        style={{ ...inputStyle, paddingRight: 32 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
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
          padding: "2px 4px",
          lineHeight: 1,
          opacity: 0.7,
        }}
        title={revealed ? "Hide" : "Show"}
      >
        {revealed ? "\u{1F441}" : "\u{1F441}\u{200D}\u{1F5E8}"}
      </button>
    </div>
  );
}

export function VariableEditor({ variables, onChange, accentColor }: VariableEditorProps) {
  const accent = accentColor ?? "var(--accent-purple)";

  const updateVar = (index: number, patch: Partial<NodeVariable>) => {
    const next = [...variables];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeVar = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const addVar = (kind: VariableKind = "text") => {
    onChange([...variables, { name: "", value: "", type: kind }]);
  };

  return (
    <div>
      {variables.length === 0 && (
        <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 10, fontStyle: "italic" }}>
          No variables yet. Add API keys, passwords, notes, or text values.
        </div>
      )}

      {variables.map((v, i) => (
        <div
          key={i}
          style={{
            padding: 8,
            background: `${kindColors[v.type]}08`,
            border: "1px solid var(--border-color)",
            borderLeft: `3px solid ${kindColors[v.type]}`,
            borderRadius: 6,
            marginBottom: 6,
          }}
        >
          {/* Top row: type badge + name + delete */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <select
              value={v.type}
              onChange={(e) => updateVar(i, { type: e.target.value as VariableKind })}
              style={{
                ...inputStyle,
                width: 90,
                flex: "none",
                fontSize: 11,
                padding: "4px 6px",
                color: kindColors[v.type],
                fontWeight: 600,
              }}
            >
              {VARIABLE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Variable name"
              value={v.name}
              onChange={(e) => updateVar(i, { name: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeVar(i)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0 4px",
                fontSize: 14,
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Remove variable"
            >
              x
            </button>
          </div>

          {/* Value row: masked for sensitive, textarea for notes */}
          {v.type === "note" ? (
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Notes..."
              value={v.value}
              onChange={(e) => updateVar(i, { value: e.target.value })}
            />
          ) : v.type === "api-key" || v.type === "password" ? (
            <MaskedInput
              value={v.value}
              onChange={(val) => updateVar(i, { value: val })}
              placeholder={v.type === "api-key" ? "sk-..." : "Enter password"}
            />
          ) : (
            <input
              style={{ ...inputStyle }}
              placeholder="Value"
              value={v.value}
              onChange={(e) => updateVar(i, { value: e.target.value })}
            />
          )}
        </div>
      ))}

      {/* Add buttons row */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button
          onClick={() => addVar("text")}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "6px 8px",
            background: "transparent",
            color: accent,
            border: `1px dashed ${accent}`,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          + Text
        </button>
        <button
          onClick={() => addVar("api-key")}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "6px 8px",
            background: "transparent",
            color: "#f0883e",
            border: "1px dashed #f0883e",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          + API Key
        </button>
        <button
          onClick={() => addVar("password")}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "6px 8px",
            background: "transparent",
            color: "#f85149",
            border: "1px dashed #f85149",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          + Password
        </button>
        <button
          onClick={() => addVar("note")}
          style={{
            flex: 1,
            minWidth: 80,
            padding: "6px 8px",
            background: "transparent",
            color: "#8b5cf6",
            border: "1px dashed #8b5cf6",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          + Note
        </button>
      </div>
    </div>
  );
}
