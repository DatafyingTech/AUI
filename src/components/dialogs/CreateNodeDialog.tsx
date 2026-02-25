import { useState, useEffect, useMemo } from "react";
import { useUiStore } from "@/store/ui-store";
import { useTreeStore } from "@/store/tree-store";
import { scanAllSkills, type SkillInfo } from "@/services/skill-scanner";

type CreateKind = "agent" | "skill" | "group" | "pipeline";

interface CreateNodeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (kind: CreateKind, name: string, description: string, parentId: string | null, skillIds: string[]) => void;
}

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const GROUP_NAME_PATTERN = /^.{2,50}$/;

export function CreateNodeDialog({ open, onClose, onCreate }: CreateNodeDialogProps) {
  const createDialogParentId = useUiStore((s) => s.createDialogParentId);
  const createDialogDefaultKind = useUiStore((s) => s.createDialogDefaultKind);
  const nodes = useTreeStore((s) => s.nodes);
  const projectPath = useTreeStore((s) => s.projectPath);
  const assignSkillToNode = useTreeStore((s) => s.assignSkillToNode);

  const [kind, setKind] = useState<CreateKind>("agent");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  // Skill mode: "existing" to assign from catalog, "new" to create fresh
  const [skillMode, setSkillMode] = useState<"existing" | "new">("existing");
  const [selectedExistingSkillId, setSelectedExistingSkillId] = useState("");

  // Filesystem-scanned skills (all skills in the system)
  const [fsSkills, setFsSkills] = useState<SkillInfo[]>([]);

  // Build list of possible parent nodes
  const parentOptions = useMemo(() => {
    const options: Array<{ id: string; name: string }> = [];
    for (const [id, node] of nodes) {
      if (node.kind === "human" || node.kind === "agent" || node.kind === "group") {
        options.push({ id, name: node.name });
      }
    }
    options.sort((a, b) => {
      if (a.id === "root") return -1;
      if (b.id === "root") return 1;
      return a.name.localeCompare(b.name);
    });
    return options;
  }, [nodes]);

  // Build list of available skills for agent/group assignment display
  const availableSkills = useMemo(() => {
    const skills: Array<{ id: string; name: string }> = [];
    for (const [id, node] of nodes) {
      if (node.kind === "skill") {
        skills.push({ id, name: node.name });
      }
    }
    skills.sort((a, b) => a.name.localeCompare(b.name));
    return skills;
  }, [nodes]);

  // Merged all skills (tree + filesystem) for the existing skill picker
  const allExistingSkills = useMemo(() => {
    const treeIds = new Set(availableSkills.map((s) => s.id));
    const merged: Array<{ id: string; name: string; description: string }> = availableSkills.map((s) => {
      const fsMatch = fsSkills.find((f) => f.id === s.id);
      return { id: s.id, name: s.name, description: fsMatch?.description ?? "" };
    });
    for (const fs of fsSkills) {
      if (!treeIds.has(fs.id)) {
        merged.push({ id: fs.id, name: fs.name, description: fs.description });
      }
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableSkills, fsSkills]);

  // Scan filesystem for skills when dialog opens
  useEffect(() => {
    if (!open || !projectPath) return;
    let cancelled = false;
    scanAllSkills(projectPath).then((skills) => {
      if (!cancelled) setFsSkills(skills);
    });
    return () => { cancelled = true; };
  }, [open, projectPath]);

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (open) {
      const pid = createDialogParentId ?? "root";
      setParentId(pid);
      setSelectedSkills(new Set());
      setSkillMode("existing");
      setSelectedExistingSkillId("");
      const parent = nodes.get(pid);
      if (parent?.kind === "group") {
        setKind("group");
      } else if (createDialogDefaultKind && ["agent", "skill", "group", "pipeline"].includes(createDialogDefaultKind)) {
        setKind(createDialogDefaultKind as CreateKind);
      } else {
        setKind("group");
      }
    } else {
      setKind("group");
      setName("");
      setDescription("");
      setTouched(false);
      setParentId(null);
      setSelectedSkills(new Set());
      setSkillMode("existing");
      setSelectedExistingSkillId("");
    }
  }, [open, createDialogParentId, createDialogDefaultKind, nodes]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const parentNode = parentId ? nodes.get(parentId) : null;
  const isInsideTeam = parentNode?.kind === "group";
  const nameValid = kind === "group" || kind === "pipeline" ? GROUP_NAME_PATTERN.test(name) : NAME_PATTERN.test(name);
  const showError = touched && name.length > 0 && !nameValid;
  const parentLabel = parentNode ? parentNode.name : "Root";

  const kindOptions: Array<{ value: CreateKind; label: string; color: string }> = isInsideTeam
    ? [
        { value: "group", label: "Agent", color: "#f0883e" },
      ]
    : [
        { value: "group", label: "Team", color: "var(--accent-blue)" },
        { value: "agent", label: "Agent", color: "#f0883e" },
        { value: "pipeline", label: "Project Manager", color: "#d946ef" },
      ];

  function toggleSkill(skillId: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  // For skill kind: determine if "Assign Existing" is valid
  const canAssignExisting = kind === "skill" && skillMode === "existing" && selectedExistingSkillId;
  // For skill kind with "new" mode or other kinds: use normal create flow
  const canCreate = kind === "skill"
    ? skillMode === "new" && nameValid
    : kind === "pipeline"
      ? nameValid
      : nameValid;

  const handleSubmit = () => {
    if (kind === "skill" && skillMode === "existing" && selectedExistingSkillId) {
      // Assign existing skill to parent
      const targetId = parentId ?? "root";
      if (targetId && targetId !== "root") {
        assignSkillToNode(targetId, selectedExistingSkillId);
      }
      onClose();
      return;
    }
    if (canCreate) {
      onCreate(kind, name, description, parentId, Array.from(selectedSkills));
    }
  };

  // Filter existing skills to exclude ones already assigned to this parent
  const parentAssignedSkills = parentNode?.assignedSkills ?? [];
  const unassignedSkills = allExistingSkills.filter(
    (s) => !parentAssignedSkills.includes(s.id),
  );

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
          width: 440,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-surface, #1c2333)",
          borderRadius: 12,
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 16px", color: "var(--text-primary)", fontSize: 18 }}>
          {isInsideTeam ? `Add to ${parentLabel}` : "Create New"}
        </h2>

        {/* Parent indicator */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 4 }}>
            Parent
          </span>
          <select
            value={parentId ?? "root"}
            onChange={(e) => setParentId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.id === "root" ? `${opt.name} (Root)` : opt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Kind toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
          {kindOptions.map((opt, i) => {
            const isActive = kind === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setKind(opt.value);
                  if (opt.value === "skill") {
                    setSkillMode("existing");
                    setSelectedExistingSkillId("");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: "1px solid var(--border-color)",
                  background: isActive ? opt.color : "transparent",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: i === 0
                    ? "6px 0 0 6px"
                    : i === kindOptions.length - 1
                      ? "0 6px 6px 0"
                      : "0",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Skill mode: existing vs new */}
        {kind === "skill" && (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
              {(["existing", "new"] as const).map((mode, i) => {
                const isActive = skillMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSkillMode(mode)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      border: "1px solid var(--border-color)",
                      background: isActive ? "rgba(76, 175, 80, 0.2)" : "transparent",
                      color: isActive ? "var(--accent-green)" : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {mode === "existing" ? "Select Existing" : "Create New"}
                  </button>
                );
              })}
            </div>

            {skillMode === "existing" ? (
              <div style={{ marginBottom: 20 }}>
                {unassignedSkills.length === 0 ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12, fontStyle: "italic", padding: "12px 0" }}>
                    {allExistingSkills.length === 0
                      ? "No skills found. Create one first."
                      : "All skills already assigned."}
                  </div>
                ) : (
                  <select
                    value={selectedExistingSkillId}
                    onChange={(e) => setSelectedExistingSkillId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      color: "var(--text-primary)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select a skill...</option>
                    {unassignedSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.description ? ` — ${s.description.slice(0, 60)}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedExistingSkillId && (
                  <div style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    background: "rgba(76, 175, 80, 0.08)",
                    border: "1px solid rgba(76, 175, 80, 0.2)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--accent-green)",
                  }}>
                    This skill will be assigned to {parentLabel}
                  </div>
                )}
              </div>
            ) : (
              /* Create New skill form — show name + description fields below */
              null
            )}
          </>
        )}

        {/* Name field — hidden when assigning existing skill */}
        {!(kind === "skill" && skillMode === "existing") && (
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 4 }}>
              Name *
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setTouched(true);
              }}
              placeholder={kind === "pipeline" ? "Content Pipeline" : kind === "group" ? (isInsideTeam ? "Content Writer" : "Social Media Team") : kind === "skill" ? "my-skill-name" : "my-agent-name"}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-primary)",
                border: `1px solid ${showError ? "#f85149" : "var(--border-color)"}`,
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {showError && (
              <span style={{ color: "#f85149", fontSize: 11, marginTop: 4, display: "block" }}>
                {kind === "group" || kind === "pipeline"
                  ? "Name must be 2-50 characters"
                  : "Name must be lowercase with dashes only (e.g. my-skill)"}
              </span>
            )}
          </label>
        )}

        {/* Description field — hidden when assigning existing skill */}
        {!(kind === "skill" && skillMode === "existing") && (
          <label style={{ display: "block", marginBottom: (kind === "agent" || kind === "group") && availableSkills.length > 0 ? 12 : 20 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 4 }}>
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isInsideTeam && kind === "group" ? "Role and responsibilities..." : "What does this node do?"}
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </label>
        )}

        {/* Skills section for agent and group nodes (not pipeline) */}
        {(kind === "agent" || kind === "group") && availableSkills.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 8 }}>
              Assign Skills
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableSkills.map((skill) => {
                const selected = selectedSkills.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 16,
                      border: `1px solid ${selected ? "var(--accent-green)" : "var(--border-color)"}`,
                      background: selected ? "rgba(76, 175, 80, 0.15)" : "transparent",
                      color: selected ? "var(--accent-green)" : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
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
            disabled={!(canAssignExisting || canCreate)}
            onClick={handleSubmit}
            style={{
              padding: "8px 16px",
              background: (canAssignExisting || canCreate) ? "var(--accent-green)" : "#333",
              border: "none",
              borderRadius: 6,
              color: (canAssignExisting || canCreate) ? "#fff" : "#666",
              fontSize: 13,
              cursor: (canAssignExisting || canCreate) ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            {kind === "skill" && skillMode === "existing" ? "Assign" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
