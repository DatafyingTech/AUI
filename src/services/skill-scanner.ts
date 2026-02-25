import { readDir, readTextFile, exists } from "@tauri-apps/plugin-fs";
import matter from "gray-matter";
import { join, titleCase, generateNodeId } from "@/utils/paths";

// ── Public types ─────────────────────────────────────────

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
}

// ── Scanner ──────────────────────────────────────────────

// Scan .claude/skills under the given project path.
// Returns a sorted list of all discovered skills with parsed frontmatter.
export async function scanAllSkills(
  projectPath: string,
): Promise<SkillInfo[]> {
  const items: SkillInfo[] = [];
  const skillsDir = join(projectPath, ".claude", "skills");

  try {
    if (!(await exists(skillsDir))) return [];
    const entries = await readDir(skillsDir);

    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      const skillFile = join(skillsDir, entry.name, "SKILL.md");
      try {
        if (!(await exists(skillFile))) continue;
        const raw = await readTextFile(skillFile);
        const parsed = matter(raw);
        const name = parsed.data?.name
          ? String(parsed.data.name)
          : titleCase(entry.name);
        const description = parsed.data?.description
          ? String(parsed.data.description)
          : "";

        items.push({
          id: generateNodeId(skillFile),
          name,
          description,
          sourcePath: skillFile,
        });
      } catch {
        // Skip unparseable files - still include with defaults
        items.push({
          id: generateNodeId(skillFile),
          name: titleCase(entry.name),
          description: "",
          sourcePath: skillFile,
        });
      }
    }
  } catch {
    // Directory read failed
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}
