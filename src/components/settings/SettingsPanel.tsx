import { useState, useEffect, type CSSProperties } from "react";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useUiStore } from "@/store/ui-store";
import { useTreeStore } from "@/store/tree-store";
import { join } from "@/utils/paths";
import { toast } from "@/components/common/Toast";

interface AppSettings {
  apiKey: string;
  teamColor: string;
  agentColor: string;
  accentColor: string;
  autoSave: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  teamColor: "#4a9eff",
  agentColor: "#f0883e",
  accentColor: "#4a9eff",
  autoSave: true,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.5px",
};

const inputStyle: CSSProperties = {
  background: "var(--bg-primary, #0d1117)",
  border: "1px solid var(--border-color, #21262d)",
  color: "var(--text-primary, #e6edf3)",
  padding: 8,
  borderRadius: 6,
  width: "100%",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const sectionStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "1px",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-color)",
  paddingBottom: 6,
  marginTop: 20,
  marginBottom: 12,
  fontWeight: 600,
};

export function SettingsPanel() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const projectPath = useTreeStore((s) => s.projectPath);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Load settings on open
  useEffect(() => {
    if (!settingsOpen || !projectPath) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const settingsPath = join(projectPath, ".aui", "settings.json");
        if (await exists(settingsPath)) {
          const raw = await readTextFile(settingsPath);
          const parsed = JSON.parse(raw);
          if (!cancelled) setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // Use defaults
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [settingsOpen, projectPath]);

  const handleSave = async () => {
    if (!projectPath) return;
    try {
      const auiDir = join(projectPath, ".aui");
      if (!(await exists(auiDir))) {
        await mkdir(auiDir, { recursive: true });
      }
      const settingsPath = join(auiDir, "settings.json");
      await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

      // Apply color overrides to CSS variables
      const root = document.documentElement;
      if (settings.accentColor) root.style.setProperty("--accent-blue", settings.accentColor);

      toast("Settings saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    }
  };

  if (!settingsOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--toolbar-height)",
        right: 0,
        bottom: 0,
        width: 400,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-color)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        zIndex: 150,
        animation: "slideInRight 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
          Settings
        </span>
        <button
          onClick={toggleSettings}
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

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: 20, textAlign: "center" }}>
            Loading...
          </div>
        ) : (
          <>
            {/* API Key */}
            <div style={sectionStyle}>Claude API</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>API Key</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type={apiKeyVisible ? "text" : "password"}
                  style={{ ...inputStyle, flex: 1 }}
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="sk-ant-..."
                />
                <button
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                    borderRadius: 4,
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {apiKeyVisible ? "Hide" : "Show"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                Used for the Chat panel. Stored locally in .aui/settings.json
              </div>
            </div>

            {/* Colors */}
            <div style={sectionStyle}>Colors</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Team Color</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="color"
                    value={settings.teamColor}
                    onChange={(e) => setSettings({ ...settings, teamColor: e.target.value })}
                    style={{ width: 32, height: 32, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={settings.teamColor}
                    onChange={(e) => setSettings({ ...settings, teamColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Agent Color</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="color"
                    value={settings.agentColor}
                    onChange={(e) => setSettings({ ...settings, agentColor: e.target.value })}
                    style={{ width: 32, height: 32, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={settings.agentColor}
                    onChange={(e) => setSettings({ ...settings, agentColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Accent Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  style={{ width: 32, height: 32, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                />
              </div>
            </div>

            {/* Preferences */}
            <div style={sectionStyle}>Preferences</div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                Auto-save tree metadata on changes
              </span>
            </label>

            {/* Save */}
            <button
              onClick={handleSave}
              style={{
                width: "100%",
                padding: "10px 16px",
                marginTop: 16,
                background: "var(--accent-blue)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Save Settings
            </button>
          </>
        )}

        {/* Advanced */}
        <div style={sectionStyle}>Advanced</div>

        <button
          onClick={async () => {
            if (!projectPath) return;
            try {
              const { open: shellOpen } = await import("@tauri-apps/plugin-shell");
              const settingsPath = join(projectPath, ".claude", "settings.json");
              await shellOpen(settingsPath);
            } catch {
              toast("Could not open settings file", "error");
            }
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          Open Claude Settings File
        </button>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
          Opens .claude/settings.json in your default editor
        </div>
      </div>
    </div>
  );
}
