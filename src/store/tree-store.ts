import { create } from "zustand";
import { readTextFile, writeTextFile, exists, mkdir, remove } from "@tauri-apps/plugin-fs";
import type { AuiNode, TreeMetadata } from "@/types/aui-node";
import { scanProject } from "@/services/file-scanner";
import { parseAgentFile } from "@/services/agent-parser";
import { parseSkillFile } from "@/services/skill-parser";
import { parseSettingsFile } from "@/services/settings-parser";
import { writeNodeFile } from "@/services/file-writer";
import { join, normalizePath, getFileName, generateNodeId, titleCase } from "@/utils/paths";
import { detectTeam } from "@/utils/grouping";

interface TreeState {
  nodes: Map<string, AuiNode>;
  skillNameCache: Map<string, string>;
  rootId: string | null;
  projectPath: string | null;
  loading: boolean;
  error: string | null;
  metadata: TreeMetadata | null;
}

interface TreeActions {
  loadProject(path: string): Promise<void>;
  addNode(node: AuiNode): void;
  updateNode(id: string, updates: Partial<AuiNode>): void;
  removeNode(id: string): void;
  reparentNode(id: string, newParentId: string | null): void;
  saveNode(id: string): Promise<void>;
  syncFromDisk(changedPaths: string[]): Promise<void>;
  saveTreeMetadata(): Promise<void>;
  loadTreeMetadata(projectPath: string): Promise<TreeMetadata | null>;
  createAgentNode(name: string, description: string, parentId?: string): Promise<void>;
  createSkillNode(name: string, description: string, parentId?: string): Promise<void>;
  createGroupNode(name: string, description: string, parentId?: string): void;
  cacheSkillName(id: string, name: string): void;
  assignSkillToNode(nodeId: string, skillId: string): void;
  removeSkillFromNode(nodeId: string, skillId: string): void;
  deleteNodeFromDisk(id: string): Promise<void>;
  exportTeamAsSkill(teamId: string): Promise<string>;
  generateTeamSkillFiles(teamId: string): Promise<string[]>;
  saveCompanyPlan(): Promise<string>;
  autoGroupByPrefix(): void;
}

type TreeStore = TreeState & TreeActions;

function createRootNode(name: string): AuiNode {
  return {
    id: "root",
    name,
    kind: "human",
    parentId: null,
    team: null,
    sourcePath: "",
    config: null,
    promptBody: "",
    tags: [],
    lastModified: Date.now(),
    validationErrors: [],
    assignedSkills: [],
    variables: [],
    launchPrompt: "",
  };
}

function classifyFile(path: string): "agent" | "skill" | "settings" | "context" | null {
  const p = normalizePath(path);
  // .claude/agents/*.md → agent
  if (p.includes("/.claude/agents/") && p.endsWith(".md")) return "agent";
  // .claude/skills/*/SKILL.md → skill
  if (p.includes("/.claude/skills/") && p.endsWith(".md")) return "skill";
  // .claude/settings*.json → settings
  if (p.includes("/.claude/settings") && p.endsWith(".json")) return "settings";
  // CLAUDE.md, CLAUDE.local.md, .claude/rules/*.md → context
  if (p.endsWith("/CLAUDE.md") || p.endsWith("/CLAUDE.local.md")) return "context";
  if (p.includes("/.claude/rules/") && p.endsWith(".md")) return "context";
  return null;
}

async function parseFile(
  filePath: string,
  kind: "agent" | "skill" | "settings" | "context",
): Promise<AuiNode | null> {
  switch (kind) {
    case "agent":
      return parseAgentFile(filePath);
    case "skill":
      return parseSkillFile(filePath);
    case "settings":
      return parseSettingsFile(filePath);
    case "context": {
      // Context files (CLAUDE.md, rules) are plain markdown — create node directly
      const content = await readTextFile(filePath);
      return {
        id: generateNodeId(filePath),
        name: getFileName(filePath),
        kind: "context",
        parentId: null,
        team: null,
        sourcePath: filePath,
        config: null,
        promptBody: content,
        tags: [],
        lastModified: Date.now(),
        validationErrors: [],
        assignedSkills: [],
        variables: [],
        launchPrompt: "",
      };
    }
  }
}

export const useTreeStore = create<TreeStore>()((set, get) => ({
  nodes: new Map(),
  skillNameCache: new Map(),
  rootId: null,
  projectPath: null,
  loading: false,
  error: null,
  metadata: null,

  async loadProject(path: string) {
    set({ loading: true, error: null });
    try {
      const filePaths = await scanProject(path);
      const nodes = new Map<string, AuiNode>();

      // Load metadata first to get owner name and hierarchy
      const metadata = await get().loadTreeMetadata(path);
      const ownerName = metadata?.owner.name ?? "Kevin";

      // Create synthetic human root node
      const root = createRootNode(ownerName);
      nodes.set(root.id, root);

      // Parse all discovered files
      for (const filePath of filePaths) {
        const kind = classifyFile(filePath);
        if (!kind) continue;
        // Settings nodes should not appear in the tree — they're managed via the Settings panel
        if (kind === "settings") continue;

        try {
          const node = await parseFile(filePath, kind);
          if (node) {
            // Apply saved hierarchy if available
            if (metadata?.hierarchy[node.id] !== undefined) {
              node.parentId = metadata.hierarchy[node.id];
            } else if (!node.parentId) {
              node.parentId = "root";
            }
            nodes.set(node.id, node);
          }
        } catch {
          // Skip unparseable files, don't break the whole load
        }
      }

      // Restore group nodes from metadata (they have no files on disk)
      if (metadata?.groups) {
        for (const g of metadata.groups) {
          nodes.set(g.id, {
            id: g.id,
            name: g.name,
            kind: "group",
            parentId: g.parentId,
            team: g.team,
            sourcePath: "",
            config: null,
            promptBody: g.description,
            tags: [],
            lastModified: Date.now(),
            validationErrors: [],
            assignedSkills: g.assignedSkills ?? [],
            variables: g.variables ?? [],
            launchPrompt: g.launchPrompt ?? "",
          });
        }
      }

      set({
        nodes,
        rootId: "root",
        projectPath: path,
        metadata,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load project",
        loading: false,
      });
    }
  },

  addNode(node: AuiNode) {
    set((state) => {
      const next = new Map(state.nodes);
      next.set(node.id, node);
      return { nodes: next };
    });
  },

  updateNode(id: string, updates: Partial<AuiNode>) {
    set((state) => {
      const existing = state.nodes.get(id);
      if (!existing) return state;
      const next = new Map(state.nodes);
      next.set(id, { ...existing, ...updates, id });
      return { nodes: next };
    });
  },

  removeNode(id: string) {
    set((state) => {
      const next = new Map(state.nodes);
      next.delete(id);
      return { nodes: next };
    });
  },

  reparentNode(id: string, newParentId: string | null) {
    set((state) => {
      const existing = state.nodes.get(id);
      if (!existing) return state;
      const next = new Map(state.nodes);
      next.set(id, { ...existing, parentId: newParentId });
      return { nodes: next };
    });
    // Persist hierarchy change
    get().saveTreeMetadata();
  },

  async saveNode(id: string) {
    const node = get().nodes.get(id);
    if (!node) return;
    try {
      await writeNodeFile(node);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to save node",
      });
    }
  },

  async syncFromDisk(changedPaths: string[]) {
    const { nodes } = get();
    const next = new Map(nodes);

    for (const filePath of changedPaths) {
      const kind = classifyFile(filePath);
      if (!kind) continue;

      try {
        const node = await parseFile(filePath, kind);
        if (node) {
          // Preserve existing parentId if already in tree
          const existing = next.get(node.id);
          if (existing) {
            node.parentId = existing.parentId;
          }
          next.set(node.id, node);
        }
      } catch {
        // Skip unparseable files
      }
    }

    set({ nodes: next });
  },

  async saveTreeMetadata() {
    const { projectPath, nodes, metadata } = get();
    if (!projectPath) return;

    const hierarchy: Record<string, string | null> = {};
    const positions = metadata?.positions ?? {};

    // Collect group nodes for persistence (they have no files on disk)
    const groups: TreeMetadata["groups"] = [];

    for (const [id, node] of nodes) {
      if (id === "root") continue;
      hierarchy[id] = node.parentId;

      if (node.kind === "group") {
        groups.push({
          id: node.id,
          name: node.name,
          description: node.promptBody,
          parentId: node.parentId,
          team: node.team,
          assignedSkills: node.assignedSkills,
          variables: node.variables,
          launchPrompt: node.launchPrompt,
        });
      }
    }

    const updated: TreeMetadata = {
      owner: metadata?.owner ?? { name: "Kevin", description: "" },
      hierarchy,
      positions,
      groups: groups.length > 0 ? groups : undefined,
      lastModified: Date.now(),
    };

    try {
      const auiDir = join(projectPath, ".aui");
      if (!(await exists(auiDir))) {
        await mkdir(auiDir, { recursive: true });
      }
      const metaPath = join(projectPath, ".aui", "tree.json");
      await writeTextFile(metaPath, JSON.stringify(updated, null, 2));
      set({ metadata: updated });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Failed to save tree metadata",
      });
    }
  },

  async loadTreeMetadata(
    projectPath: string,
  ): Promise<TreeMetadata | null> {
    try {
      const metaPath = join(projectPath, ".aui", "tree.json");
      if (!(await exists(metaPath))) return null;
      const raw = await readTextFile(metaPath);
      return JSON.parse(raw) as TreeMetadata;
    } catch {
      return null;
    }
  },

  async createAgentNode(name: string, description: string, parentId?: string) {
    const { projectPath } = get();
    if (!projectPath) return;

    const agentsDir = join(projectPath, ".claude", "agents");
    if (!(await exists(agentsDir))) {
      await mkdir(agentsDir, { recursive: true });
    }

    const filePath = join(agentsDir, `${name}.md`);
    const displayName = titleCase(name);
    const content = `---\nname: ${displayName}\ndescription: ${description}\n---\n\n# ${displayName}\n\n${description}\n`;

    await writeTextFile(filePath, content);

    const id = generateNodeId(filePath);
    const node: AuiNode = {
      id,
      name: displayName,
      kind: "agent",
      parentId: parentId ?? "root",
      team: null,
      sourcePath: filePath,
      config: null,
      promptBody: content,
      tags: [],
      lastModified: Date.now(),
      validationErrors: [],
      assignedSkills: [],
      variables: [],
      launchPrompt: "",
    };

    set((state) => {
      const next = new Map(state.nodes);
      next.set(id, node);
      return { nodes: next };
    });
  },

  async createSkillNode(name: string, description: string, parentId?: string) {
    const { projectPath } = get();
    if (!projectPath) return;

    const skillDir = join(projectPath, ".claude", "skills", name);
    if (!(await exists(skillDir))) {
      await mkdir(skillDir, { recursive: true });
    }

    const filePath = join(skillDir, "SKILL.md");
    const displayName = titleCase(name);
    const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${displayName}\n\n## Steps\n\n1. Define steps here\n\n## Notes\n- ${description}\n`;

    await writeTextFile(filePath, content);

    const id = generateNodeId(filePath);
    const node: AuiNode = {
      id,
      name: displayName,
      kind: "skill",
      parentId: parentId ?? "root",
      team: null,
      sourcePath: filePath,
      config: null,
      promptBody: content,
      tags: [],
      lastModified: Date.now(),
      validationErrors: [],
      assignedSkills: [],
      variables: [],
      launchPrompt: "",
    };

    set((state) => {
      const next = new Map(state.nodes);
      next.set(id, node);
      return { nodes: next };
    });
  },

  createGroupNode(name: string, description: string, parentId?: string) {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const node: AuiNode = {
      id,
      name,
      kind: "group",
      parentId: parentId ?? "root",
      team: null,
      sourcePath: "",
      config: null,
      promptBody: description,
      tags: [],
      lastModified: Date.now(),
      validationErrors: [],
      assignedSkills: [],
      variables: [],
      launchPrompt: "",
    };

    set((state) => {
      const next = new Map(state.nodes);
      next.set(id, node);
      return { nodes: next };
    });

    get().saveTreeMetadata();
  },

  cacheSkillName(id: string, name: string) {
    set((state) => {
      const next = new Map(state.skillNameCache);
      next.set(id, name);
      return { skillNameCache: next };
    });
  },

  assignSkillToNode(nodeId: string, skillId: string) {
    set((state) => {
      const existing = state.nodes.get(nodeId);
      if (!existing) return state;
      if (existing.assignedSkills.includes(skillId)) return state;
      const next = new Map(state.nodes);
      next.set(nodeId, {
        ...existing,
        assignedSkills: [...existing.assignedSkills, skillId],
      });
      return { nodes: next };
    });
    get().saveTreeMetadata();
  },

  removeSkillFromNode(nodeId: string, skillId: string) {
    set((state) => {
      const existing = state.nodes.get(nodeId);
      if (!existing) return state;
      const next = new Map(state.nodes);
      next.set(nodeId, {
        ...existing,
        assignedSkills: existing.assignedSkills.filter((s) => s !== skillId),
      });
      return { nodes: next };
    });
    get().saveTreeMetadata();
  },

  async deleteNodeFromDisk(id: string) {
    const { nodes } = get();
    const node = nodes.get(id);
    if (!node) return;

    // Recursively collect all descendant IDs (children, grandchildren, etc.)
    function collectDescendants(parentId: string): string[] {
      const ids: string[] = [];
      for (const [childId, childNode] of nodes) {
        if (childNode.parentId === parentId) {
          ids.push(childId);
          ids.push(...collectDescendants(childId));
        }
      }
      return ids;
    }

    const allIds = [id, ...collectDescendants(id)];

    // Delete files from disk for all nodes being removed
    for (const nodeId of allIds) {
      const n = nodes.get(nodeId);
      if (!n?.sourcePath) continue;

      try {
        await remove(n.sourcePath);

        // For skills, also remove the parent directory
        if (n.kind === "skill") {
          const parts = normalizePath(n.sourcePath).split("/");
          parts.pop(); // remove filename
          const parentDir = parts.join("/");
          try {
            await remove(parentDir, { recursive: true });
          } catch {
            // Silently ignore — directory may not be empty or already removed
          }
        }
      } catch {
        // Silently ignore — file may already be removed
      }
    }

    set((state) => {
      const next = new Map(state.nodes);
      for (const nodeId of allIds) {
        next.delete(nodeId);
      }
      return { nodes: next };
    });

    // Persist updated metadata after removing nodes
    get().saveTreeMetadata();
  },

  async exportTeamAsSkill(teamId: string) {
    const { nodes, projectPath } = get();
    if (!projectPath) throw new Error("No project loaded");

    const team = nodes.get(teamId);
    if (!team || team.kind !== "group") throw new Error("Not a team node");

    const slugName = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Collect direct agents (children) of this team
    const agents: AuiNode[] = [];
    for (const n of nodes.values()) {
      if (n.parentId === teamId) agents.push(n);
    }

    // Collect root node for global context
    const rootNode = nodes.get("root");

    // Collect global skills from root
    const globalSkillNames = (rootNode?.assignedSkills ?? [])
      .map((sid) => nodes.get(sid)?.name ?? sid)
      .filter(Boolean);

    // Collect team-level skills
    const teamSkillNames = team.assignedSkills
      .map((sid) => nodes.get(sid)?.name ?? sid)
      .filter(Boolean);

    // Collect all sibling teams for company context
    const siblingTeams: AuiNode[] = [];
    for (const n of nodes.values()) {
      if (n.kind === "group" && n.parentId === "root" && n.id !== teamId) {
        siblingTeams.push(n);
      }
    }

    // Helper: get full skill content by name
    function getSkillContent(skillId: string): string {
      const skillNode = nodes.get(skillId);
      if (skillNode?.promptBody) {
        // Extract meaningful content (strip frontmatter markers)
        return skillNode.promptBody.replace(/^---[\s\S]*?---\s*/, "").trim();
      }
      return "";
    }

    // Build detailed agent profile
    function buildAgentProfile(agent: AuiNode): string {
      let block = `### ${agent.name}\n\n`;

      if (agent.promptBody) {
        block += `**Role:** ${agent.promptBody}\n\n`;
      }

      // Agent config details
      const cfg = agent.config as Record<string, unknown> | null;
      if (cfg) {
        if (cfg.model) block += `**Model:** \`${cfg.model}\`\n`;
        if (cfg.permissionMode) block += `**Permission Mode:** \`${cfg.permissionMode}\`\n`;
        if (cfg.maxTurns) block += `**Max Turns:** ${cfg.maxTurns}\n`;
        if (Array.isArray(cfg.tools) && cfg.tools.length > 0) {
          block += `**Tools:** ${(cfg.tools as string[]).map((t) => `\`${t}\``).join(", ")}\n`;
        }
        if (Array.isArray(cfg.disallowedTools) && cfg.disallowedTools.length > 0) {
          block += `**Disallowed Tools:** ${(cfg.disallowedTools as string[]).map((t) => `\`${t}\``).join(", ")}\n`;
        }
      }

      // Agent skills
      const skillNames = agent.assignedSkills
        .map((sid) => nodes.get(sid)?.name ?? sid)
        .filter(Boolean);
      if (skillNames.length > 0) {
        block += `\n**Skills:**\n`;
        for (const sName of skillNames) {
          block += `- \`/${sName}\`\n`;
        }
      }

      // Agent variables
      if (agent.variables.length > 0) {
        block += `\n**Environment Variables:**\n`;
        for (const v of agent.variables) {
          block += `- \`${v.name}\`: ${v.value ? `\`${v.value}\`` : "(to be provided)"}\n`;
        }
      }

      // Sub-agents
      const subAgents: AuiNode[] = [];
      for (const n of nodes.values()) {
        if (n.parentId === agent.id) subAgents.push(n);
      }
      if (subAgents.length > 0) {
        block += `\n**Sub-agents:**\n`;
        for (const sub of subAgents) {
          block += `- **${sub.name}**`;
          if (sub.promptBody) block += ` — ${sub.promptBody}`;
          block += "\n";
        }
      }

      block += "\n";
      return block;
    }

    // ── Build the comprehensive skill file ──
    let content = `---\nname: ${slugName}\ndescription: "${team.name} — deployable team skill generated by AUI"\n---\n\n`;
    content += `# ${team.name}\n\n`;
    if (team.promptBody) content += `> ${team.promptBody}\n\n`;

    // Slash command activation
    content += `## Activation\n\n`;
    content += `Invoke this team with \`/${slugName}\` or by saying "deploy the ${team.name}".\n\n`;

    // Company context
    content += `## Company Context\n\n`;
    content += `**Organization:** ${rootNode?.name ?? "Unknown"}\n`;
    if (rootNode?.promptBody) content += `**Description:** ${rootNode.promptBody}\n`;
    content += `**This Team:** ${team.name} (${agents.length} agents)\n`;
    if (siblingTeams.length > 0) {
      content += `**Other Teams:** ${siblingTeams.map((t) => t.name).join(", ")}\n`;
    }
    content += "\n";

    // Global skills
    if (globalSkillNames.length > 0) {
      content += `## Global Skills (Available to All Agents)\n\n`;
      content += `These skills are assigned at the organization level and are available to every agent:\n\n`;
      for (const sName of globalSkillNames) {
        content += `- \`/${sName}\`\n`;
      }
      content += "\n";
    }

    // Team-level skills
    if (teamSkillNames.length > 0) {
      content += `## Team Skills\n\n`;
      content += `All agents on this team share access to:\n\n`;
      for (const sName of teamSkillNames) {
        content += `- \`/${sName}\`\n`;
        // Include skill content inline
        const sid = team.assignedSkills.find((id) => {
          const n = nodes.get(id);
          return n?.name === sName;
        });
        if (sid) {
          const skillContent = getSkillContent(sid);
          if (skillContent && skillContent.length < 500) {
            content += `  > ${skillContent.split("\n").join("\n  > ")}\n`;
          }
        }
      }
      content += "\n";
    }

    // Team variables
    if (team.variables.length > 0) {
      content += `## Team Variables\n\n`;
      content += `These environment variables are available to the team:\n\n`;
      content += `| Variable | Value |\n|----------|-------|\n`;
      for (const v of team.variables) {
        content += `| \`${v.name}\` | ${v.value ? `\`${v.value}\`` : "*(to be provided)*"} |\n`;
      }
      content += "\n";
    }

    // Detailed team roster
    content += `## Team Roster (${agents.length} agents)\n\n`;
    for (const agent of agents) {
      content += buildAgentProfile(agent);
    }

    // Inter-agent coordination rules
    content += `## Coordination Rules\n\n`;
    content += `1. **Team Lead:** The deploying Claude instance acts as the team manager ("${team.name}" lead)\n`;
    content += `2. **Communication:** Agents communicate through the team lead via SendMessage. Direct peer messaging is allowed for tightly-coupled tasks\n`;
    content += `3. **Task Assignment:** The team lead creates tasks (TaskCreate) and assigns them to agents by name\n`;
    content += `4. **Skill Invocation:** Agents invoke their assigned skills using slash commands (e.g. \`/skill-name\`)\n`;
    content += `5. **Conflict Resolution:** If agents produce conflicting outputs, the team lead resolves by evaluating against the launch prompt goals\n`;
    content += `6. **File Ownership:** Each agent should work on distinct files to avoid merge conflicts. If overlap is unavoidable, coordinate via the team lead\n\n`;

    // Launch prompt / deployment instructions
    content += `## Deployment Instructions\n\n`;
    content += `**IMPORTANT: This skill MUST be run using Claude Code's agent team mode.**\n\n`;
    content += `When this skill is activated:\n\n`;
    content += `1. **Create the team** — Use \`TeamCreate\` with team name \`${slugName}\`\n`;
    content += `2. **Spawn agents** — Use the \`Task\` tool to spawn each agent as a teammate:\n`;
    for (const agent of agents) {
      const agentSlug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const skillNames = agent.assignedSkills
        .map((sid) => nodes.get(sid)?.name ?? sid)
        .filter(Boolean);
      content += `   - **${agent.name}** (\`name: "${agentSlug}"\`, \`subagent_type: "general-purpose"\`)`;
      if (agent.promptBody) content += `\n     Role: ${agent.promptBody}`;
      if (skillNames.length > 0) content += `\n     Skills: ${skillNames.join(", ")}`;
      if (agent.variables.length > 0) content += `\n     Variables: ${agent.variables.map((v) => `${v.name}=${v.value || "..."}`).join(", ")}`;
      content += "\n";
    }
    content += `3. **Create tasks** — Break the user's request into discrete tasks using \`TaskCreate\` and assign to agents using \`TaskUpdate\` with the \`owner\` parameter\n`;
    content += `4. **Set dependencies** — Use \`TaskUpdate\` with \`addBlockedBy\` to establish task ordering where needed\n`;
    content += `5. **Monitor progress** — Check \`TaskList\` periodically. When agents send messages, they are delivered automatically\n`;
    content += `6. **Coordinate** — The team lead oversees all agents, resolves conflicts, and ensures deliverables integrate correctly\n`;
    content += `7. **Report** — When all tasks complete, compile a summary of what was accomplished and present to the user\n`;
    content += `8. **Shutdown** — Send \`shutdown_request\` to each agent, then call \`TeamDelete\` to clean up\n\n`;

    // Launch prompt
    if (team.launchPrompt) {
      content += `## Default Launch Prompt\n\n`;
      content += `When deploying this team, use the following as the initial task:\n\n`;
      content += `> ${team.launchPrompt.split("\n").join("\n> ")}\n\n`;
    }

    // Success criteria
    content += `## Success Criteria\n\n`;
    content += `The team deployment is considered successful when:\n\n`;
    content += `- All assigned tasks are marked as completed\n`;
    content += `- No unresolved errors or blockers remain\n`;
    content += `- The team lead has verified the integrated output\n`;
    content += `- A summary report has been delivered to the user\n`;

    // Write to disk
    const skillDir = join(projectPath, ".claude", "skills", slugName);
    if (!(await exists(skillDir))) {
      await mkdir(skillDir, { recursive: true });
    }
    const filePath = join(skillDir, "SKILL.md");
    await writeTextFile(filePath, content);

    // Add to tree
    const id = generateNodeId(filePath);
    const skillNode: AuiNode = {
      id,
      name: team.name,
      kind: "skill",
      parentId: "root",
      team: null,
      sourcePath: filePath,
      config: null,
      promptBody: content,
      tags: ["team-skill"],
      lastModified: Date.now(),
      validationErrors: [],
      assignedSkills: [],
      variables: [],
      launchPrompt: "",
    };

    set((state) => {
      const next = new Map(state.nodes);
      next.set(id, skillNode);
      return { nodes: next };
    });

    return filePath;
  },

  async generateTeamSkillFiles(teamId: string) {
    const { nodes, projectPath } = get();
    if (!projectPath) throw new Error("No project loaded");

    const team = nodes.get(teamId);
    if (!team || team.kind !== "group") throw new Error("Not a team node");

    const teamSlug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const rootNode = nodes.get("root");

    // Collect direct agents (children) of this team
    const agents: AuiNode[] = [];
    for (const n of nodes.values()) {
      if (n.parentId === teamId) agents.push(n);
    }

    // Team-level skills
    const teamSkillNames = team.assignedSkills
      .map((sid) => nodes.get(sid)?.name ?? sid)
      .filter(Boolean);

    const generatedPaths: string[] = [];

    // 1) Generate skill file for the TEAM NODE (senior manager) — only if missing
    const managerDir = join(projectPath, ".claude", "skills", `${teamSlug}-manager`);
    const managerPath = join(managerDir, "SKILL.md");

    if (await exists(managerPath)) {
      generatedPaths.push(managerPath);
    } else {
    if (!(await exists(managerDir))) await mkdir(managerDir, { recursive: true });

    let managerContent = `---\nname: ${teamSlug}-manager\ndescription: "Senior manager skill for the ${team.name} team"\n---\n\n`;
    managerContent += `# ${team.name} — Senior Manager\n\n`;
    managerContent += `You are the **senior manager** of the "${team.name}" team.\n\n`;
    if (team.promptBody) managerContent += `> ${team.promptBody}\n\n`;
    managerContent += `## Your Responsibilities\n\n`;
    managerContent += `1. **Coordinate** ${agents.length} team members to achieve the team's objectives\n`;
    managerContent += `2. **Delegate** tasks to the appropriate specialist agent\n`;
    managerContent += `3. **Review** work from team members for quality and consistency\n`;
    managerContent += `4. **Resolve** conflicts and blockers that arise during execution\n`;
    managerContent += `5. **Report** progress and final results to the user\n\n`;

    if (agents.length > 0) {
      managerContent += `## Your Team\n\n`;
      for (const agent of agents) {
        managerContent += `- **${agent.name}**: ${agent.promptBody || "Team member"}\n`;
      }
      managerContent += "\n";
    }

    if (teamSkillNames.length > 0) {
      managerContent += `## Team Skills\n\n${teamSkillNames.map((s) => `- \`/${s}\``).join("\n")}\n\n`;
    }

    if (team.variables.length > 0) {
      managerContent += `## Team Variables\n\n`;
      for (const v of team.variables) {
        managerContent += `- \`${v.name}\`: ${v.value || "(to be provided)"}\n`;
      }
      managerContent += "\n";
    }

    managerContent += `## Management Protocol\n\n`;
    managerContent += `- Use \`TaskCreate\` to break objectives into discrete, assignable tasks\n`;
    managerContent += `- Use \`TaskUpdate\` with \`owner\` to assign tasks to team members by name\n`;
    managerContent += `- Use \`SendMessage\` to communicate with team members\n`;
    managerContent += `- Use \`TaskList\` to monitor overall progress\n`;
    managerContent += `- When all tasks are complete, compile a summary report\n`;

    await writeTextFile(managerPath, managerContent);
    generatedPaths.push(managerPath);
    } // end if !exists managerPath

    // 2) Generate skill file for EACH AGENT — only if missing
    for (const agent of agents) {
      const agentSlug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const agentDir = join(projectPath, ".claude", "skills", `${teamSlug}-${agentSlug}`);
      const agentPath = join(agentDir, "SKILL.md");

      if (await exists(agentPath)) {
        generatedPaths.push(agentPath);
        continue;
      }

      if (!(await exists(agentDir))) await mkdir(agentDir, { recursive: true });

      let agentContent = `---\nname: ${teamSlug}-${agentSlug}\ndescription: "${agent.name} — specialist agent on the ${team.name} team"\n---\n\n`;
      agentContent += `# ${agent.name}\n\n`;
      agentContent += `You are **${agent.name}**, a specialist agent on the **${team.name}** team.\n\n`;
      if (agent.promptBody) agentContent += `> ${agent.promptBody}\n\n`;

      agentContent += `## Your Role\n\n`;
      agentContent += `You report to the ${team.name} senior manager. Focus on your area of expertise and deliver high-quality results.\n\n`;

      // Agent-specific skills
      const agentSkillNames = agent.assignedSkills
        .map((sid) => nodes.get(sid)?.name ?? sid)
        .filter(Boolean);

      if (agentSkillNames.length > 0) {
        agentContent += `## Your Skills\n\n${agentSkillNames.map((s) => `- \`/${s}\``).join("\n")}\n\n`;
      }

      // Agent variables
      if (agent.variables.length > 0) {
        agentContent += `## Your Variables\n\n`;
        for (const v of agent.variables) {
          agentContent += `- \`${v.name}\`: ${v.value || "(to be provided)"}\n`;
        }
        agentContent += "\n";
      }

      // Config details
      const cfg = agent.config as Record<string, unknown> | null;
      if (cfg) {
        const details: string[] = [];
        if (cfg.model) details.push(`Model: \`${cfg.model}\``);
        if (Array.isArray(cfg.tools) && cfg.tools.length > 0) {
          details.push(`Tools: ${(cfg.tools as string[]).map((t) => `\`${t}\``).join(", ")}`);
        }
        if (details.length > 0) {
          agentContent += `## Configuration\n\n${details.join("\n")}\n\n`;
        }
      }

      // Sub-agents
      const subAgents: AuiNode[] = [];
      for (const n of nodes.values()) {
        if (n.parentId === agent.id) subAgents.push(n);
      }
      if (subAgents.length > 0) {
        agentContent += `## Sub-agents\n\n`;
        for (const sub of subAgents) {
          agentContent += `- **${sub.name}**`;
          if (sub.promptBody) agentContent += ` — ${sub.promptBody}`;
          agentContent += "\n";
        }
        agentContent += "\n";
      }

      agentContent += `## Work Protocol\n\n`;
      agentContent += `1. Check \`TaskList\` for assigned tasks\n`;
      agentContent += `2. Mark tasks \`in_progress\` when starting work\n`;
      agentContent += `3. Complete the task thoroughly and mark it \`completed\`\n`;
      agentContent += `4. Send a message to the team lead summarizing what you accomplished\n`;
      agentContent += `5. Check for more available tasks\n`;

      await writeTextFile(agentPath, agentContent);
      generatedPaths.push(agentPath);
    }

    return generatedPaths;
  },

  async saveCompanyPlan() {
    const { nodes, projectPath } = get();
    if (!projectPath) throw new Error("No project loaded");

    const planDir = join(projectPath, ".aui", "company-plan");
    if (!(await exists(planDir))) {
      await mkdir(planDir, { recursive: true });
    }

    // Collect top-level teams (groups whose parent is root)
    const teams: AuiNode[] = [];
    const standaloneAgents: AuiNode[] = [];
    const standaloneSkills: AuiNode[] = [];

    for (const [id, node] of nodes) {
      if (id === "root") continue;
      if (node.parentId === "root" || !node.parentId) {
        if (node.kind === "group") teams.push(node);
        else if (node.kind === "agent") standaloneAgents.push(node);
        else if (node.kind === "skill") standaloneSkills.push(node);
      }
    }

    // Helper to collect descendants
    function getChildren(parentId: string): AuiNode[] {
      const children: AuiNode[] = [];
      for (const n of nodes.values()) {
        if (n.parentId === parentId) children.push(n);
      }
      return children;
    }

    // Build README.md — overview document
    let readme = `# Company Plan\n\n`;
    readme += `> Generated by AUI on ${new Date().toISOString().split("T")[0]}\n\n`;
    readme += `## Overview\n\n`;
    readme += `- **Teams:** ${teams.length}\n`;
    readme += `- **Standalone Agents:** ${standaloneAgents.length}\n`;
    readme += `- **Skills:** ${standaloneSkills.length}\n\n`;

    if (teams.length > 0) {
      readme += `## Teams\n\n`;
      for (const team of teams) {
        const agents = getChildren(team.id);
        readme += `### ${team.name}\n\n`;
        if (team.promptBody) readme += `${team.promptBody}\n\n`;
        readme += `- **Agents:** ${agents.length}\n`;
        const teamSkills = team.assignedSkills
          .map((sid) => nodes.get(sid)?.name ?? sid)
          .filter(Boolean);
        if (teamSkills.length > 0) {
          readme += `- **Team Skills:** ${teamSkills.join(", ")}\n`;
        }
        readme += "\n";

        if (agents.length > 0) {
          readme += `| Agent | Role | Skills |\n|-------|------|--------|\n`;
          for (const agent of agents) {
            const skills = agent.assignedSkills
              .map((sid) => nodes.get(sid)?.name ?? sid)
              .filter(Boolean);
            readme += `| ${agent.name} | ${agent.promptBody || "—"} | ${skills.join(", ") || "—"} |\n`;
          }
          readme += "\n";
        }
      }
    }

    if (standaloneAgents.length > 0) {
      readme += `## Standalone Agents\n\n`;
      for (const agent of standaloneAgents) {
        readme += `- **${agent.name}**`;
        if (agent.promptBody) readme += ` — ${agent.promptBody}`;
        readme += "\n";
      }
      readme += "\n";
    }

    if (standaloneSkills.length > 0) {
      readme += `## Skills Library\n\n`;
      for (const skill of standaloneSkills) {
        readme += `- **${skill.name}**`;
        if (skill.promptBody) {
          const firstLine = skill.promptBody.split("\n").find(
            (l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"),
          );
          if (firstLine) readme += ` — ${firstLine.trim().slice(0, 100)}`;
        }
        readme += "\n";
      }
      readme += "\n";
    }

    await writeTextFile(join(planDir, "README.md"), readme);

    // Write individual team files
    for (const team of teams) {
      const agents = getChildren(team.id);
      const teamSkills = team.assignedSkills
        .map((sid) => nodes.get(sid)?.name ?? sid)
        .filter(Boolean);
      const slug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      let teamMd = `# ${team.name}\n\n`;
      if (team.promptBody) teamMd += `${team.promptBody}\n\n`;
      if (teamSkills.length > 0) {
        teamMd += `## Team Skills\n\n${teamSkills.map((s) => `- ${s}`).join("\n")}\n\n`;
      }
      teamMd += `## Agents\n\n`;
      for (const agent of agents) {
        const skills = agent.assignedSkills
          .map((sid) => nodes.get(sid)?.name ?? sid)
          .filter(Boolean);
        teamMd += `### ${agent.name}\n\n`;
        if (agent.promptBody) teamMd += `${agent.promptBody}\n\n`;
        if (skills.length > 0) {
          teamMd += `**Skills:** ${skills.join(", ")}\n\n`;
        }

        // Sub-agents
        const subAgents = getChildren(agent.id);
        if (subAgents.length > 0) {
          teamMd += `**Sub-agents:**\n\n`;
          for (const sub of subAgents) {
            teamMd += `- ${sub.name}`;
            if (sub.promptBody) teamMd += ` — ${sub.promptBody}`;
            teamMd += "\n";
          }
          teamMd += "\n";
        }
      }

      await writeTextFile(join(planDir, `${slug}.md`), teamMd);
    }

    return planDir;
  },

  autoGroupByPrefix() {
    set((state) => {
      const next = new Map(state.nodes);
      for (const [id, node] of next) {
        if (id === "root") continue;
        const team = detectTeam(node.name);
        next.set(id, { ...node, team });
      }
      return { nodes: next };
    });
  },
}));
