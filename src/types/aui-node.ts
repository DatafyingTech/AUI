import type { AgentConfig } from "./agent";
import type { SkillConfig } from "./skill";
import type { SettingsConfig } from "./settings";

export type NodeKind = "human" | "agent" | "skill" | "context" | "settings" | "group";

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
