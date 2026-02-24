import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useUiStore } from "@/store/ui-store";
import { useTreeStore } from "@/store/tree-store";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: "Create Skill", prompt: "Create a new Claude Code skill that " },
  { label: "Design Team", prompt: "Design a multi-agent team for " },
  { label: "Explain Node", prompt: "Explain what this node does and how it fits into the agent hierarchy" },
] as const;

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const nodes = useTreeStore((s) => s.nodes);
  const skillNameCache = useTreeStore((s) => s.skillNameCache);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [shellAvailable, setShellAvailable] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const childRef = useRef<{ kill: () => Promise<void> } | null>(null);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Check shell availability on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Command } = await import("@tauri-apps/plugin-shell");
        // Try a simple command to verify the plugin is functional
        const cmd = Command.create("claude", ["--version"]);
        await cmd.execute();
        if (!cancelled) setShellAvailable(true);
      } catch {
        if (!cancelled) setShellAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function addMessage(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), role, content, timestamp: Date.now() },
    ]);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || running) return;

    // Prepend node context if a node is selected
    let fullPrompt = trimmed;
    if (selectedNode) {
      const skillNames = selectedNode.assignedSkills
        .map((sid) => {
          const n = nodes.get(sid);
          if (n?.name) return n.name;
          const cached = skillNameCache.get(sid);
          if (cached) return cached;
          return null;
        })
        .filter((n): n is string => n !== null);
      const contextLines = [
        `[Context: ${selectedNode.name} (${selectedNode.kind})]`,
      ];
      if (selectedNode.promptBody) {
        contextLines.push(`[Description: ${selectedNode.promptBody.slice(0, 200)}]`);
      }
      if (skillNames.length > 0) {
        contextLines.push(`[Skills: ${skillNames.join(", ")}]`);
      }
      fullPrompt = contextLines.join("\n") + "\n\n" + trimmed;
    }

    addMessage("user", trimmed);
    setInput("");
    setRunning(true);

    // Add a streaming response placeholder
    const responseId = Math.random().toString(36).slice(2);
    setMessages((prev) => [
      ...prev,
      { id: responseId, role: "assistant", content: "", timestamp: Date.now() },
    ]);

    try {
      const { Command } = await import("@tauri-apps/plugin-shell");

      const args: string[] = ["--print", fullPrompt];
      const cmd = Command.create("claude", args);

      let stdout = "";

      cmd.stdout.on("data", (line: string) => {
        stdout += line + "\n";
        // Update the streaming message in real-time
        setMessages((prev) =>
          prev.map((m) => (m.id === responseId ? { ...m, content: stdout.trim() } : m)),
        );
      });

      cmd.stderr.on("data", (line: string) => {
        stdout += line + "\n";
      });

      const child = await cmd.spawn();
      childRef.current = child;

      cmd.on("close", () => {
        childRef.current = null;
        const output = stdout.trim() || "(no output)";
        setMessages((prev) =>
          prev.map((m) => (m.id === responseId ? { ...m, content: output } : m)),
        );
        setRunning(false);
      });

      cmd.on("error", (err: string) => {
        childRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === responseId ? { ...m, role: "system", content: `Error: ${err}` } : m,
          ),
        );
        setRunning(false);
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === responseId
            ? { ...m, role: "system", content: "Claude CLI is not available. Run the app via 'pnpm tauri dev' (not plain Vite) and ensure 'claude' is in your PATH." }
            : m,
        ),
      );
      setShellAvailable(false);
      setRunning(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
    if (e.key === "Escape") {
      onClose();
    }
  }

  function handleQuickAction(prompt: string) {
    const context = selectedNode
      ? `[Context: ${selectedNode.name} (${selectedNode.kind})]\n\n`
      : "";
    setInput(context + prompt);
    inputRef.current?.focus();
  }

  async function handleStop() {
    if (childRef.current) {
      try {
        await childRef.current.kill();
      } catch {
        // Process may have already exited
      }
      childRef.current = null;
      setRunning(false);
      addMessage("system", "Process stopped.");
    }
  }

  // --- Styles ---

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.4)",
    zIndex: 199,
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  const panelStyle: CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50vh",
    minHeight: 300,
    maxHeight: "70vh",
    background: "var(--bg-secondary)",
    borderTop: "1px solid var(--border-color)",
    boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    zIndex: 200,
    transform: open ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.25s ease",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid var(--border-color)",
    flexShrink: 0,
  };

  const contextBarStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 16px",
    background: "rgba(74, 158, 255, 0.08)",
    borderBottom: "1px solid var(--border-color)",
    flexShrink: 0,
  };

  const messagesAreaStyle: CSSProperties = {
    flex: 1,
    overflow: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "var(--bg-primary)",
  };

  const inputAreaStyle: CSSProperties = {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    borderTop: "1px solid var(--border-color)",
    background: "var(--bg-secondary)",
    flexShrink: 0,
    alignItems: "flex-end",
  };

  return (
    <>
      {/* Overlay */}
      <div style={overlayStyle} onClick={onClose} />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Claude Chat
            </span>
            {shellAvailable === false && (
              <span style={{ fontSize: 11, color: "var(--accent-gold)", fontWeight: 500 }}>
                (CLI unavailable)
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 18,
                padding: "0 4px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Context bar (when node selected) */}
        {selectedNode && (
          <div style={contextBarStyle}>
            <span style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 600 }}>
              Context:
            </span>
            <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
              {selectedNode.name}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                background: "rgba(74, 158, 255, 0.15)",
                padding: "1px 8px",
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {selectedNode.kind}
            </span>
          </div>
        )}

        {/* Quick actions */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "8px 16px",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              disabled={running}
              style={{
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 600,
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--accent-blue)",
                borderRadius: 14,
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.5 : 1,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!running) {
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                  e.currentTarget.style.background = "rgba(74, 158, 255, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages area */}
        <div style={messagesAreaStyle}>
          {messages.length === 0 && !running && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                color: "var(--text-secondary)",
              }}
            >
              {shellAvailable === false ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Claude CLI not available</span>
                  <span style={{ fontSize: 12, textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
                    Run the app via <b>pnpm tauri dev</b> (not plain Vite) and ensure
                    &quot;claude&quot; is installed and in your PATH.
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Chat with Claude</span>
                  <span style={{ fontSize: 12 }}>
                    Ask questions, create skills, or get help with your agent configuration.
                  </span>
                </>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {running && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <span style={spinnerStyle} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Claude is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={inputAreaStyle}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={shellAvailable === false ? "Claude CLI not available..." : "Ask Claude something... (Enter to send, Shift+Enter for newline)"}
            disabled={shellAvailable === false}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "8px 12px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              minHeight: 36,
              maxHeight: 100,
              lineHeight: 1.4,
              opacity: shellAvailable === false ? 0.5 : 1,
            }}
          />
          {running ? (
            <button
              onClick={handleStop}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: "#e74c3c",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || shellAvailable === false}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: input.trim() && shellAvailable !== false ? "var(--accent-blue)" : "var(--border-color)",
                border: "none",
                color: input.trim() && shellAvailable !== false ? "#fff" : "var(--text-secondary)",
                borderRadius: 8,
                cursor: input.trim() && shellAvailable !== false ? "pointer" : "not-allowed",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// --- Sub-components ---

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const bubbleStyle: CSSProperties = {
    maxWidth: isUser ? "75%" : "100%",
    alignSelf: isUser ? "flex-end" : "flex-start",
    padding: "8px 12px",
    borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
    background: isUser
      ? "var(--accent-blue)"
      : isSystem
        ? "rgba(255, 193, 7, 0.1)"
        : "#1e1e3a",
    color: isUser
      ? "#fff"
      : isSystem
        ? "var(--accent-gold)"
        : "var(--text-primary)",
    fontSize: 13,
    lineHeight: 1.5,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    fontFamily: isUser ? "inherit" : "'Consolas', 'Monaco', 'Courier New', monospace",
    border: isSystem ? "1px solid rgba(255, 193, 7, 0.2)" : "none",
  };

  return <div style={bubbleStyle}>{message.content}</div>;
}

// --- Spinner ---

const spinnerStyle: CSSProperties = {
  display: "inline-block",
  width: 12,
  height: 12,
  border: "2px solid var(--border-color)",
  borderTop: "2px solid var(--accent-blue)",
  borderRadius: "50%",
  animation: "chatSpin 0.8s linear infinite",
};

// Inject keyframes for spinner if not present
if (typeof document !== "undefined") {
  const styleId = "chat-panel-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@keyframes chatSpin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
