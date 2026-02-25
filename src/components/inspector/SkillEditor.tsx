import { useState, useEffect, type CSSProperties } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { useTreeStore } from "@/store/tree-store";
import { useAutosave } from "@/hooks/useAutosave";
import type { AuiNode } from "@/types/aui-node";
import type { SkillConfig } from "@/types/skill";

const labelStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.5px",
};

const inputStyle: CSSProperties = {
  background: "#1a1a2e",
  border: "1px solid #2a2a4a",
  color: "white",
  padding: 8,
  borderRadius: 4,
  width: "100%",
  fontSize: 13,
  outline: "none",
};

const fieldStyle: CSSProperties = {
  marginBottom: 16,
};

interface SkillEditorProps {
  node: AuiNode;
}

export function SkillEditor({ node }: SkillEditorProps) {
  const updateNode = useTreeStore((s) => s.updateNode);
  const saveNode = useTreeStore((s) => s.saveNode);

  const cfg = (node.config as SkillConfig | null) ?? { name: node.name };

  const [name, setName] = useState(cfg.name);
  const [description, setDescription] = useState(cfg.description ?? "");
  const [version, setVersion] = useState(cfg.version ?? "");
  const [license, setLicense] = useState(cfg.license ?? "");
  const [promptBody, setPromptBody] = useState(node.promptBody);
  useEffect(() => {
    const c = (node.config as SkillConfig | null) ?? { name: node.name };
    setName(c.name);
    setDescription(c.description ?? "");
    setVersion(c.version ?? "");
    setLicense(c.license ?? "");
    setPromptBody(node.promptBody);
  }, [node.id, node.config, node.promptBody, node.name]);

  const resetForm = () => {
    const c = (node.config as SkillConfig | null) ?? { name: node.name };
    setName(c.name);
    setDescription(c.description ?? "");
    setVersion(c.version ?? "");
    setLicense(c.license ?? "");
    setPromptBody(node.promptBody);
  };

  const handleSave = () => {
    const updatedConfig: SkillConfig = {
      name,
      ...(description ? { description } : {}),
      ...(version ? { version } : {}),
      ...(license ? { license } : {}),
    };

    updateNode(node.id, {
      name,
      config: updatedConfig,
      promptBody,
      lastModified: Date.now(),
    });
    saveNode(node.id);
  };

  // Autosave on changes
  useAutosave(handleSave, [name, description, version, license, promptBody], node.id);

  return (
    <div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Version</label>
        <input
          style={inputStyle}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="1.0.0"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>License</label>
        <input
          style={inputStyle}
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          placeholder="MIT"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Prompt Body</label>
        <MarkdownEditor
          value={promptBody}
          onChange={setPromptBody}
          height={400}
        />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={resetForm}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
