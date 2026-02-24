import type { AuiNode } from "../types/aui-node";
import type { AgentConfig } from "../types/agent";
import type { SkillConfig } from "../types/skill";
import type { SettingsConfig } from "../types/settings";
import { AgentConfigSchema } from "../types/agent";
import { SkillConfigSchema } from "../types/skill";
import { SettingsConfigSchema } from "../types/settings";

export function validateNode(node: AuiNode): string[] {
  const errors: string[] = [];

  if (!node.id) errors.push("Missing node id");
  if (!node.name) errors.push("Missing node name");
  if (!node.kind) errors.push("Missing node kind");
  if (!node.sourcePath) errors.push("Missing source path");

  if (node.config) {
    switch (node.kind) {
      case "agent": {
        const result = validateAgentConfig(node.config);
        errors.push(...result.errors);
        break;
      }
      case "skill": {
        const result = validateSkillConfig(node.config);
        errors.push(...result.errors);
        break;
      }
      case "settings": {
        const result = validateSettingsConfig(node.config);
        errors.push(...result.errors);
        break;
      }
    }
  }

  return errors;
}

export function validateAgentConfig(
  config: unknown
): { success: boolean; errors: string[]; data?: AgentConfig } {
  const result = AgentConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, errors: [], data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}

export function validateSkillConfig(
  config: unknown
): { success: boolean; errors: string[]; data?: SkillConfig } {
  const result = SkillConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, errors: [], data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}

export function validateSettingsConfig(
  config: unknown
): { success: boolean; errors: string[]; data?: SettingsConfig } {
  const result = SettingsConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, errors: [], data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}
