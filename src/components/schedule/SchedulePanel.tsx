import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";
import { join } from "@/utils/paths";
import { toast } from "@/components/common/Toast";
import type { AuiNode } from "@/types/aui-node";

interface ScheduledJob {
  id: string;
  teamId: string;
  teamName: string;
  cron: string;
  prompt: string;
  enabled: boolean;
  createdAt: number;
}

const panelStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: 420,
  height: "100%",
  background: "var(--bg-secondary)",
  borderLeft: "1px solid var(--border-color)",
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.3)",
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

const labelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.5px",
};

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekdays at 9am", value: "0 9 * * 1-5" },
  { label: "Weekly (Monday 9am)", value: "0 9 * * 1" },
  { label: "Monthly (1st at 9am)", value: "0 9 1 * *" },
];

interface SchedulePanelProps {
  onClose: () => void;
}

export function SchedulePanel({ onClose }: SchedulePanelProps) {
  const projectPath = useTreeStore((s) => s.projectPath);
  const nodes = useTreeStore((s) => s.nodes);

  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * *");
  const [prompt, setPrompt] = useState("");

  // Get top-level teams
  const teams: AuiNode[] = [];
  for (const n of nodes.values()) {
    if (n.kind === "group" && n.parentId === "root") teams.push(n);
  }

  // Load schedules
  useEffect(() => {
    if (!projectPath) return;
    loadSchedules();
  }, [projectPath]);

  const loadSchedules = useCallback(async () => {
    if (!projectPath) return;
    try {
      const schedulePath = join(projectPath, ".aui", "schedules.json");
      if (await exists(schedulePath)) {
        const raw = await readTextFile(schedulePath);
        setJobs(JSON.parse(raw));
      }
    } catch {
      // Start with empty
    }
  }, [projectPath]);

  const saveSchedules = useCallback(async (updatedJobs: ScheduledJob[]) => {
    if (!projectPath) return;
    try {
      const auiDir = join(projectPath, ".aui");
      if (!(await exists(auiDir))) await mkdir(auiDir, { recursive: true });
      const schedulePath = join(auiDir, "schedules.json");
      await writeTextFile(schedulePath, JSON.stringify(updatedJobs, null, 2));
      setJobs(updatedJobs);
    } catch {
      toast("Failed to save schedules", "error");
    }
  }, [projectPath]);

  const handleCreate = useCallback(() => {
    if (!selectedTeamId || !cronExpr.trim()) return;
    const team = nodes.get(selectedTeamId);
    if (!team) return;

    const newJob: ScheduledJob = {
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teamId: selectedTeamId,
      teamName: team.name,
      cron: cronExpr.trim(),
      prompt: prompt.trim(),
      enabled: true,
      createdAt: Date.now(),
    };

    const updated = [...jobs, newJob];
    saveSchedules(updated);
    setShowCreate(false);
    setSelectedTeamId("");
    setCronExpr("0 9 * * *");
    setPrompt("");
    toast("Schedule created", "success");
  }, [selectedTeamId, cronExpr, prompt, jobs, nodes, saveSchedules]);

  const handleToggle = useCallback((jobId: string) => {
    const updated = jobs.map((j) =>
      j.id === jobId ? { ...j, enabled: !j.enabled } : j,
    );
    saveSchedules(updated);
  }, [jobs, saveSchedules]);

  const handleDelete = useCallback((jobId: string) => {
    const updated = jobs.filter((j) => j.id !== jobId);
    saveSchedules(updated);
    toast("Schedule removed", "success");
  }, [jobs, saveSchedules]);

  const describeCron = (cron: string): string => {
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    if (preset) return preset.label;
    return cron;
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
          Scheduled Deployments
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              padding: "4px 12px",
              background: "var(--accent-blue)",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            + New
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 18,
              padding: "0 4px",
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {/* Create form */}
        {showCreate && (
          <div
            style={{
              padding: 14,
              background: "#1a1a2e",
              border: "1px solid var(--accent-blue)",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-blue)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              New Schedule
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Team</label>
              <select
                style={inputStyle}
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                <option value="">Select a team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Schedule</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  style={{ ...inputStyle, flex: 1 }}
                  value={CRON_PRESETS.find((p) => p.value === cronExpr) ? cronExpr : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") setCronExpr(e.target.value);
                  }}
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
              </div>
              <input
                style={{ ...inputStyle, marginTop: 6, fontFamily: "monospace", fontSize: 12 }}
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="* * * * * (min hour day month weekday)"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Prompt</label>
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should this team accomplish on each run?"
              />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleCreate}
                disabled={!selectedTeamId || !cronExpr.trim()}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: selectedTeamId && cronExpr.trim() ? "var(--accent-blue)" : "var(--border-color)",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: selectedTeamId && cronExpr.trim() ? "pointer" : "default",
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: selectedTeamId && cronExpr.trim() ? 1 : 0.5,
                }}
              >
                Create Schedule
              </button>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Jobs list */}
        {jobs.length === 0 && !showCreate && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              padding: "40px 20px",
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }}>No scheduled deployments</div>
            <div>Click <b>+ New</b> to schedule a team for recurring deployment.</div>
          </div>
        )}

        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              padding: 12,
              background: job.enabled ? "rgba(74, 158, 255, 0.05)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${job.enabled ? "var(--border-color)" : "rgba(255,255,255,0.05)"}`,
              borderRadius: 8,
              marginBottom: 8,
              opacity: job.enabled ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                {job.teamName}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => handleToggle(job.id)}
                  style={{
                    padding: "2px 8px",
                    fontSize: 10,
                    fontWeight: 600,
                    background: job.enabled ? "rgba(63,185,80,0.15)" : "rgba(255,255,255,0.1)",
                    color: job.enabled ? "#3fb950" : "var(--text-secondary)",
                    border: `1px solid ${job.enabled ? "rgba(63,185,80,0.3)" : "var(--border-color)"}`,
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  {job.enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => handleDelete(job.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "0 4px",
                  }}
                  title="Delete schedule"
                >
                  x
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 8,
                  background: "rgba(74,158,255,0.15)",
                  color: "var(--accent-blue)",
                }}
              >
                {describeCron(job.cron)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--text-secondary)",
                }}
              >
                {job.cron}
              </span>
            </div>

            {job.prompt && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {job.prompt}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-color)",
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.4,
        }}
      >
        Schedules are saved to <code style={{ color: "var(--accent-blue)" }}>.aui/schedules.json</code>.
        Use an external cron runner or the Claude CLI to execute scheduled deployments.
      </div>
    </div>
  );
}
