import { useState, useEffect } from "react";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useTreeStore } from "@/store/tree-store";
import { join } from "@/utils/paths";
import { toast } from "@/components/common/Toast";

type Step = 1 | 2 | 3;

export function SetupWizard() {
  const projectPath = useTreeStore((s) => s.projectPath);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Step 2 state
  const [teamsEnabled, setTeamsEnabled] = useState<boolean | null>(null);
  const [teamsError, setTeamsError] = useState(false);
  const [enabling, setEnabling] = useState(false);

  // Summary state
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Check if wizard should show
  useEffect(() => {
    if (!projectPath) return;
    (async () => {
      try {
        const settingsPath = join(projectPath, ".aui", "settings.json");
        if (await exists(settingsPath)) {
          const raw = await readTextFile(settingsPath);
          const data = JSON.parse(raw);
          if (data.setupCompleted === true) return;
        }
        setVisible(true);
      } catch {
        setVisible(true);
      }
    })();
  }, [projectPath]);

  // Check agent teams status when entering step 2
  useEffect(() => {
    if (step !== 2 || !projectPath) return;
    (async () => {
      try {
        const claudeSettingsPath = join(projectPath, ".claude", "settings.json");
        if (await exists(claudeSettingsPath)) {
          const raw = await readTextFile(claudeSettingsPath);
          const settings = JSON.parse(raw);
          const val = settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
          setTeamsEnabled(val === "1");
        } else {
          setTeamsEnabled(false);
        }
        setTeamsError(false);
      } catch {
        setTeamsEnabled(null);
        setTeamsError(true);
      }
    })();
  }, [step, projectPath]);

  if (!visible || !projectPath) return null;

  // -- Helpers --

  async function ensureAuiDir() {
    const auiDir = join(projectPath!, ".aui");
    if (!(await exists(auiDir))) {
      await mkdir(auiDir, { recursive: true });
    }
  }

  async function readAuiSettings(): Promise<Record<string, unknown>> {
    const settingsPath = join(projectPath!, ".aui", "settings.json");
    try {
      if (await exists(settingsPath)) {
        return JSON.parse(await readTextFile(settingsPath));
      }
    } catch { /* ignore */ }
    return {};
  }

  async function writeAuiSettings(data: Record<string, unknown>) {
    await ensureAuiDir();
    const settingsPath = join(projectPath!, ".aui", "settings.json");
    await writeTextFile(settingsPath, JSON.stringify(data, null, 2));
  }

  // -- Step 1 handlers --

  async function handleSaveApiKey() {
    if (!apiKey.trim()) {
      toast("Please enter an API key", "error");
      return;
    }
    try {
      const settings = await readAuiSettings();
      settings.apiKey = apiKey.trim();
      await writeAuiSettings(settings);
      setApiKeySaved(true);
      toast("API key saved", "success");
      setStep(2);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save API key", "error");
    }
  }

  function handleSkipApiKey() {
    setStep(2);
  }

  // -- Step 2 handlers --

  async function handleEnableTeams() {
    if (!projectPath) return;
    setEnabling(true);
    try {
      const claudeSettingsPath = join(projectPath, ".claude", "settings.json");
      let settings: Record<string, unknown> = {};
      if (await exists(claudeSettingsPath)) {
        settings = JSON.parse(await readTextFile(claudeSettingsPath));
      }
      const env = (settings.env as Record<string, string>) || {};
      env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
      settings.env = env;
      await writeTextFile(claudeSettingsPath, JSON.stringify(settings, null, 2));
      setTeamsEnabled(true);
      setTeamsError(false);
      toast("Agent teams enabled!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to enable teams", "error");
      setTeamsError(true);
    } finally {
      setEnabling(false);
    }
  }

  // -- Step 3 handler --

  async function handleGetStarted() {
    try {
      const settings = await readAuiSettings();
      settings.setupCompleted = true;
      await writeAuiSettings(settings);
      setVisible(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    }
  }

  async function openExternalUrl(url: string) {
    try {
      const { open: shellOpen } = await import("@tauri-apps/plugin-shell");
      await shellOpen(url);
    } catch {
      toast("Could not open browser", "error");
    }
  }

  // -- Styles --

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20000,
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 480,
    width: "90%",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 12,
    padding: "32px 28px 24px",
    color: "var(--text-primary)",
    position: "relative",
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: "var(--accent-blue)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  // -- Step indicator --

  function StepDots() {
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: s === step ? "var(--accent-blue)" : "var(--border-color)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
    );
  }

  // -- Step content --

  function renderStep1() {
    return (
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>
          Welcome to ATM
        </h2>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>
          Agent Team Manager
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Organize your Claude Code agents into super teams that work in parallel.
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Anthropic API Key
        </label>
        <div style={{ position: "relative", marginBottom: 6 }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{ ...inputStyle, paddingRight: 40 }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12,
              padding: "2px 4px",
            }}
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <button
          onClick={() => openExternalUrl("https://console.anthropic.com/settings/keys")}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent-blue)",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            marginBottom: 20,
            textDecoration: "underline",
          }}
        >
          Get API Key
        </button>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={handleSkipApiKey} style={secondaryBtnStyle}>
            Skip
          </button>
          <button onClick={handleSaveApiKey} style={primaryBtnStyle}>
            Next
          </button>
        </div>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
          Claude Code Agent Teams
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Agent teams allow Claude Code to spawn multiple AI agents that work in parallel.
          ATM helps you organize and manage these teams.
        </p>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "var(--bg-primary)",
            marginBottom: 20,
          }}
        >
          {teamsError ? (
            <>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Could not read Claude settings. You can enable agent teams manually by adding
                this to <code style={{ color: "var(--accent-blue)" }}>~/.claude/settings.json</code>:
              </p>
              <pre
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  background: "var(--bg-secondary)",
                  padding: "8px 10px",
                  borderRadius: 4,
                  overflow: "auto",
                }}
              >
{`{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}`}
              </pre>
            </>
          ) : teamsEnabled === true ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--accent-green)", fontSize: 20 }}>&#10003;</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Agent teams are enabled!</span>
            </div>
          ) : teamsEnabled === false ? (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Agent teams are not currently enabled in your Claude Code settings.
              </p>
              <button
                onClick={handleEnableTeams}
                disabled={enabling}
                style={{
                  ...primaryBtnStyle,
                  opacity: enabling ? 0.6 : 1,
                  cursor: enabling ? "not-allowed" : "pointer",
                }}
              >
                {enabling ? "Enabling..." : "Enable Teams"}
              </button>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              Checking team status...
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setStep(1)} style={secondaryBtnStyle}>
            Back
          </button>
          <button onClick={() => setStep(3)} style={primaryBtnStyle}>
            Next
          </button>
        </div>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
          You're all set!
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          ATM is ready to help you manage your AI agent teams.
        </p>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "var(--bg-primary)",
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <span style={{ color: apiKeySaved ? "var(--accent-green)" : "var(--text-secondary)", fontSize: 16 }}>
              {apiKeySaved ? "\u2713" : "\u2013"}
            </span>
            <span>{apiKeySaved ? "API key saved" : "API key skipped"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <span style={{ color: teamsEnabled ? "var(--accent-green)" : "var(--text-secondary)", fontSize: 16 }}>
              {teamsEnabled ? "\u2713" : "\u2013"}
            </span>
            <span>
              {teamsEnabled ? "Agent teams enabled" : "Agent teams not enabled"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setStep(2)} style={secondaryBtnStyle}>
            Back
          </button>
          <button onClick={handleGetStarted} style={primaryBtnStyle}>
            Get Started
          </button>
        </div>
      </>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <StepDots />
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
