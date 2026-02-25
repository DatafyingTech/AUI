import matter from "gray-matter";
import { writeTextFile, rename, remove } from "@tauri-apps/plugin-fs";
import type { AuiNode } from "@/types/aui-node";
import type { AgentConfig } from "@/types/agent";
import type { SettingsConfig } from "@/types/settings";
import { AgentConfigSchema } from "@/types/agent";
import { SkillConfigSchema } from "@/types/skill";
import { SettingsConfigSchema } from "@/types/settings";

/**
 * Write an agent or skill AuiNode back to disk as Markdown with YAML frontmatter.
 * Validates the config with Zod before writing.
 * Uses atomic write (temp file + rename) for safety.
 */
export async function writeAgentFile(node: AuiNode): Promise<void> {
  if (!node.config) throw new Error("Cannot write agent file: config is null");

  const schema = node.kind === "skill" ? SkillConfigSchema : AgentConfigSchema;
  const result = schema.safeParse(node.config);
  if (!result.success) {
    const msgs = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new Error(`Validation failed: ${msgs.join("; ")}`);
  }

  // Build frontmatter data — exclude 'name' if it matches derived name
  const data = { ...result.data } as Record<string, unknown>;
  const output = matter.stringify(node.promptBody, data);

  const tmpPath = node.sourcePath + ".tmp";
  await writeTextFile(tmpPath, output);
  try {
    await rename(tmpPath, node.sourcePath);
  } catch {
    // If rename fails, try to clean up the temp file
    try { await remove(tmpPath); } catch { /* ignore */ }
    throw new Error(`Failed to atomically write ${node.sourcePath}`);
  }
}

/**
 * Write a settings AuiNode back to disk as JSON.
 * Validates the config with Zod before writing.
 */
/**
 * Unified writer — dispatches to the correct writer based on node kind.
 */
export async function writeNodeFile(node: AuiNode): Promise<void> {
  switch (node.kind) {
    case "agent":
    case "skill":
      return writeAgentFile(node);
    case "settings":
      return writeSettingsFile(node);
    default:
      throw new Error(`Cannot write node of kind "${node.kind}"`);
  }
}

/**
 * Write a settings AuiNode back to disk as JSON.
 * Validates the config with Zod before writing.
 */
export async function writeSettingsFile(node: AuiNode): Promise<void> {
  if (!node.config) throw new Error("Cannot write settings file: config is null");

  const result = SettingsConfigSchema.safeParse(node.config);
  if (!result.success) {
    const msgs = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new Error(`Validation failed: ${msgs.join("; ")}`);
  }

  const output = JSON.stringify(result.data, null, 2) + "\n";

  const tmpPath = node.sourcePath + ".tmp";
  await writeTextFile(tmpPath, output);
  try {
    await rename(tmpPath, node.sourcePath);
  } catch {
    try { await remove(tmpPath); } catch { /* ignore */ }
    throw new Error(`Failed to atomically write ${node.sourcePath}`);
  }
}
