import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

/**
 * Pack tree JSON + skill files into a ZIP archive.
 * Structure: tree.aui.json + skills/{name}/SKILL.md
 */
export function packExportZip(
  treeJson: string,
  skillFiles: Map<string, string>,
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "tree.aui.json": strToU8(treeJson),
  };
  for (const [relativePath, content] of skillFiles) {
    files[`skills/${relativePath}`] = strToU8(content);
  }
  return zipSync(files, { level: 6 });
}

/**
 * Unpack a ZIP archive into tree JSON + skill files.
 */
export function unpackExportZip(data: Uint8Array): {
  treeJson: string;
  skillFiles: Map<string, string>;
} {
  const extracted = unzipSync(data);
  let treeJson = "";
  const skillFiles = new Map<string, string>();

  for (const [path, content] of Object.entries(extracted)) {
    if (path === "tree.aui.json") {
      treeJson = strFromU8(content);
    } else if (path.startsWith("skills/")) {
      skillFiles.set(path.slice(7), strFromU8(content));
    }
  }

  return { treeJson, skillFiles };
}
