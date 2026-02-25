import type { AgentConfig } from "./agent";
import type { SkillConfig } from "./skill";
import type { SettingsConfig } from "./settings";

export type NodeKind = "human" | "agent" | "skill" | "context" | "settings" | "group" | "pipeline";

export interface PipelineStep {
  id: string;          // unique step ID (e.g., "step-{timestamp}")
  teamId: string;      // reference to an existing team (group node)
  prompt: string;      // deploy prompt for this step
}

export interface NodeVariable {
  name: string;
  value: string;
}

export interface AuiNode {
  id: string;
  name: string;
  kind: NodeKind;
  parentId: string | null;
  team: string | null;
  sourcePath: string;
  config: AgentConfig | SkillConfig | SettingsConfig | null;
  promptBody: string;
  tags: string[];
  lastModified: number;
  validationErrors: string[];
  assignedSkills: string[];
  variables: NodeVariable[];
  launchPrompt: string;
  pipelineSteps: PipelineStep[];
}

export interface TreeExport {
  version: "1.0";
  exportedAt: number;
  appVersion: string;
  owner: { name: string; description: string };
  nodes: AuiNode[];
  hierarchy: Record<string, string | null>;
  positions: Record<string, { x: number; y: number }>;
  groups: Array<{
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    team: string | null;
    assignedSkills: string[];
    variables: NodeVariable[];
    launchPrompt: string;
    kind?: "group" | "pipeline";
    pipelineSteps?: PipelineStep[];
  }>;
  skillNameCache: Record<string, string>;
}

export interface TreeMetadata {
  owner: {
    name: string;
    description: string;
  };
  hierarchy: Record<string, string | null>; // nodeId -> parentId
  positions: Record<string, { x: number; y: number }>;
  groups?: Array<{
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    team: string | null;
    assignedSkills: string[];
    variables: NodeVariable[];
    launchPrompt: string;
    kind?: "group" | "pipeline";
    pipelineSteps?: PipelineStep[];
  }>;
  lastModified: number;
}

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  treeData: TreeMetadata;
}

export interface LayoutIndex {
  activeLayoutId: string;
  layouts: Array<{
    id: string;
    name: string;
    lastModified: number;
  }>;
}
