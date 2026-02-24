import { readTextFile } from "@tauri-apps/plugin-fs";
import type { AuiNode } from "../types/aui-node";
import type { SettingsConfig } from "../types/settings";
import { SettingsConfigSchema } from "../types/settings";
import { getFileName, generateNodeId } from "../utils/paths";

/**
 * Parse a settings JSON file into an AuiNode.
 * If content is not provided, reads the file from disk via Tauri FS.
 */
export async function parseSettingsFile(
  filePath: string,
  content?: string
): Promise<AuiNode> {
  const raw = content ?? (await readTextFile(filePath));
  let rawConfig: unknown;
  const parseErrors: string[] = [];

  try {
    rawConfig = JSON.parse(raw);
  } catch (err) {
    parseErrors.push(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
    return {
      id: generateNodeId(filePath),
      name: getFileName(filePath),
      kind: "settings",
      parentId: null,
      team: null,
      sourcePath: filePath,
      config: null,
      promptBody: "",
      tags: [],
      lastModified: Date.now(),
      validationErrors: parseErrors,
      assignedSkills: [],
      variables: [],
      launchPrompt: "",
    };
  }

  const result = SettingsConfigSchema.safeParse(rawConfig);
  const config: SettingsConfig = result.success
    ? result.data
    : (rawConfig as SettingsConfig);
  const validationErrors = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  return {
    id: generateNodeId(filePath),
    name: getFileName(filePath),
    kind: "settings",
    parentId: null,
    team: null,
    sourcePath: filePath,
    config,
    promptBody: "",
    tags: [],
    lastModified: Date.now(),
    validationErrors,
    assignedSkills: [],
    variables: [],
    launchPrompt: "",
  };
}
