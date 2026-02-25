import matter from "gray-matter";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { AuiNode } from "@/types/aui-node";
import type { AgentConfig } from "@/types/agent";
import { AgentConfigSchema } from "@/types/agent";
import { getFileName, titleCase, generateNodeId } from "@/utils/paths";

/**
 * Parse a .md agent file into an AuiNode.
 * If content is not provided, reads the file from disk via Tauri FS.
 */
export async function parseAgentFile(
  filePath: string,
  content?: string
): Promise<AuiNode> {
  const raw = content ?? (await readTextFile(filePath));
  const parsed = matter(raw);
  const hasFrontmatter = Object.keys(parsed.data).length > 0;

  const name: string =
    hasFrontmatter && parsed.data.name
      ? String(parsed.data.name)
      : titleCase(getFileName(filePath));

  const rawConfig: Record<string, unknown> = {
    name,
    ...(hasFrontmatter ? parsed.data : {}),
  };

  const result = AgentConfigSchema.safeParse(rawConfig);
  const config: AgentConfig = result.success
    ? result.data
    : (rawConfig as AgentConfig);
  const validationErrors = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  return {
    id: generateNodeId(filePath),
    name,
    kind: "agent",
    parentId: null,
    team: null,
    sourcePath: filePath,
    config,
    promptBody: parsed.content,
    tags: [],
    lastModified: Date.now(),
    validationErrors,
    assignedSkills: [],
    variables: [],
    launchPrompt: "",
  };
}
