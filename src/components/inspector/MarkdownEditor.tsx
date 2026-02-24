import Editor from "@monaco-editor/react";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
}

export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  height = "300px",
}: MarkdownEditorProps) {
  return (
    <Editor
      height={height}
      language="markdown"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      options={{
        readOnly,
        wordWrap: "on",
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "off",
        scrollBeyondLastLine: false,
        renderLineHighlight: readOnly ? "none" : "line",
        padding: { top: 8 },
      }}
    />
  );
}
