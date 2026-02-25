import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import { useTreeStore } from "@/store/tree-store";
import { useUiStore } from "@/store/ui-store";
import { useAutosave } from "@/hooks/useAutosave";
import type { AuiNode, PipelineStep, NodeVariable } from "@/types/aui-node";
import { VariableEditor } from "./VariableEditor";

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
  transition: "border-color 0.15s",
  boxSizing: "border-box" as const,
};

const sectionHeaderStyle: CSSProperties = {
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

const ACCENT = "#d946ef";

export function PipelineEditor({ node }: { node: AuiNode }) {
  const updateNode = useTreeStore((s) => s.updateNode);
  const nodes = useTreeStore((s) => s.nodes);
  const saveTreeMetadata = useTreeStore((s) => s.saveTreeMetadata);
  const updatePipelineSteps = useTreeStore((s) => s.updatePipelineSteps);
  const deployPipeline = useTreeStore((s) => s.deployPipeline);

  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.promptBody);
  const [steps, setSteps] = useState<PipelineStep[]>(node.pipelineSteps);
  const [variables, setVariables] = useState<NodeVariable[]>(node.variables);
  const [deploying, setDeploying] = useState(false);

  // Re-init state on node change
  useEffect(() => {
    setName(node.name);
    setDescription(node.promptBody);
    setSteps(node.pipelineSteps);
    setVariables(node.variables);
  }, [node.id, node.name, node.promptBody, node.pipelineSteps, node.variables]);

  // Available teams: root-level group nodes
  const availableTeams = useMemo(() => {
    const teams: AuiNode[] = [];
    for (const n of nodes.values()) {
      if (n.kind === "group" && n.parentId === "root") {
        teams.push(n);
      }
    }
    return teams.sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes]);

  // Autosave name, description, and variables
  const handleSave = useCallback(() => {
    updateNode(node.id, {
      name,
      promptBody: description,
      variables: variables.filter((v) => v.name.trim()),
      lastModified: Date.now(),
    });
    saveTreeMetadata();
  }, [name, description, variables, node.id, updateNode, saveTreeMetadata]);

  useAutosave(handleSave, [name, description, variables], node.id);

  // Step mutation helpers — update local state and sync to store
  const commitSteps = useCallback(
    (next: PipelineStep[]) => {
      setSteps(next);
      updatePipelineSteps(node.id, next);
    },
    [node.id, updatePipelineSteps],
  );

  const handleAddStep = useCallback(() => {
    const next: PipelineStep[] = [
      ...steps,
      { id: "step-" + Date.now(), teamId: "", prompt: "" },
    ];
    commitSteps(next);
  }, [steps, commitSteps]);

  const handleDeleteStep = useCallback(
    (index: number) => {
      const next = steps.filter((_, i) => i !== index);
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...steps];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= steps.length - 1) return;
      const next = [...steps];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      const original = steps[index];
      const copy: PipelineStep = {
        id: "step-" + Date.now(),
        teamId: original.teamId,
        prompt: original.prompt,
      };
      const next = [...steps];
      next.splice(index + 1, 0, copy);
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handleStepTeamChange = useCallback(
    (index: number, teamId: string) => {
      const next = [...steps];
      next[index] = { ...next[index], teamId };
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handleStepPromptChange = useCallback(
    (index: number, prompt: string) => {
      const next = [...steps];
      next[index] = { ...next[index], prompt };
      commitSteps(next);
    },
    [steps, commitSteps],
  );

  const handlePlayAll = useCallback(async () => {
    setDeploying(true);
    try {
      await deployPipeline(node.id);
    } finally {
      setDeploying(false);
    }
  }, [deployPipeline, node.id]);

  const handleSchedule = useCallback(() => {
    useUiStore.getState().toggleSchedule(node.id);
  }, [node.id]);

  // Small reusable button style builder for step action buttons
  const stepBtnStyle = (disabled: boolean): CSSProperties => ({
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 600,
    background: "transparent",
    color: disabled ? "var(--text-secondary)" : "var(--text-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: 4,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "opacity 0.15s",
  });

  return (
    <div>
      {/* 1. Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 2. Description */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description</label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* 3. Pipeline Steps */}
      <div style={sectionHeaderStyle}>Pipeline Steps</div>

      {steps.length === 0 && (
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: 12,
            marginBottom: 12,
            fontStyle: "italic",
          }}
        >
          No steps yet. Add a step to get started.
        </div>
      )}

      {steps.map((step, index) => {
        const teamNode = step.teamId ? nodes.get(step.teamId) : null;
        const teamName = teamNode?.name ?? "";

        return (
          <div
            key={step.id}
            style={{
              padding: 10,
              background: "rgba(217, 70, 239, 0.04)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            {/* Step header: number badge + team dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {/* Step number badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: ACCENT,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>

              {/* Team dropdown */}
              <select
                style={{ ...inputStyle, flex: 1, boxSizing: "border-box" as const }}
                value={step.teamId}
                onChange={(e) => handleStepTeamChange(index, e.target.value)}
              >
                <option value="">Select a team...</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt textarea */}
            <textarea
              rows={2}
              style={{
                ...inputStyle,
                resize: "vertical",
                marginBottom: 8,
              }}
              placeholder="What should this team do?"
              value={step.prompt}
              onChange={(e) => handleStepPromptChange(index, e.target.value)}
            />

            {/* Action buttons row */}
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                style={stepBtnStyle(index === 0)}
                title="Move up"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === steps.length - 1}
                style={stepBtnStyle(index === steps.length - 1)}
                title="Move down"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => handleDuplicate(index)}
                style={stepBtnStyle(false)}
                title="Duplicate step"
              >
                Duplicate
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => handleDeleteStep(index)}
                style={{
                  ...stepBtnStyle(false),
                  color: "var(--accent-danger, #f85149)",
                  borderColor: "var(--accent-danger, #f85149)",
                }}
                title="Delete step"
              >
                X
              </button>
            </div>
          </div>
        );
      })}

      {/* Add Step button */}
      <button
        type="button"
        onClick={handleAddStep}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          color: ACCENT,
          border: `1px dashed ${ACCENT}`,
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        + Add Step
      </button>

      {/* 4. Variables */}
      <div style={sectionHeaderStyle}>
        Variables ({variables.filter((v) => v.name.trim()).length})
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.4 }}>
        API keys, passwords, and config values passed to each step in this pipeline.
      </div>
      <VariableEditor variables={variables} onChange={setVariables} accentColor={ACCENT} />

      {/* 5. Deploy */}
      <div style={sectionHeaderStyle}>Deploy</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={handlePlayAll}
          disabled={deploying || steps.length === 0}
          style={{
            flex: 2,
            padding: "10px 16px",
            background: deploying || steps.length === 0 ? "var(--border-color)" : ACCENT,
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: deploying || steps.length === 0 ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: deploying || steps.length === 0 ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {deploying ? "Deploying..." : "Play All"}
        </button>
        <button
          type="button"
          onClick={handleSchedule}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: "transparent",
            color: ACCENT,
            border: `1px solid ${ACCENT}`,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          Schedule
        </button>
      </div>

      <div
        style={{
          fontSize: 10,
          color: "var(--text-secondary)",
          marginBottom: 4,
          lineHeight: 1.4,
        }}
      >
        <b>Play All</b> runs all steps sequentially in one terminal.{" "}
        <b>Schedule</b> sets up recurring runs.
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginTop: 6,
        }}
      >
        {steps.length} step{steps.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
