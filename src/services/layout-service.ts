/**
 * Layout service — file I/O for saved layouts.
 * Persists layout data to .aui/layouts/ directory.
 */
import { readTextFile, writeTextFile, exists, mkdir, remove } from "@tauri-apps/plugin-fs";
import { join } from "@/utils/paths";
import type { TreeMetadata, LayoutIndex } from "@/types/aui-node";

const LAYOUTS_DIR = "layouts";
const INDEX_FILE = "index.json";

async function ensureDir(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

function layoutsDir(projectPath: string): string {
  return join(projectPath, ".aui", LAYOUTS_DIR);
}

/** Read .aui/layouts/index.json */
export async function loadLayoutIndex(projectPath: string): Promise<LayoutIndex | null> {
  try {
    const path = join(layoutsDir(projectPath), INDEX_FILE);
    if (await exists(path)) {
      const raw = await readTextFile(path);
      return JSON.parse(raw) as LayoutIndex;
    }
  } catch {
    // Index doesn't exist or is corrupt — return null
  }
  return null;
}

/** Write .aui/layouts/index.json, ensuring the directory exists */
export async function saveLayoutIndex(projectPath: string, index: LayoutIndex): Promise<void> {
  const dir = layoutsDir(projectPath);
  await ensureDir(dir);
  const path = join(dir, INDEX_FILE);
  await writeTextFile(path, JSON.stringify(index, null, 2));
}

/** Write .aui/layouts/<id>.json */
export async function saveLayout(
  projectPath: string,
  layoutId: string,
  treeData: TreeMetadata,
): Promise<void> {
  const dir = layoutsDir(projectPath);
  await ensureDir(dir);
  const path = join(dir, `${layoutId}.json`);
  await writeTextFile(path, JSON.stringify(treeData, null, 2));
}

/** Read .aui/layouts/<id>.json */
export async function loadLayout(
  projectPath: string,
  layoutId: string,
): Promise<TreeMetadata | null> {
  try {
    const path = join(layoutsDir(projectPath), `${layoutId}.json`);
    if (await exists(path)) {
      const raw = await readTextFile(path);
      return JSON.parse(raw) as TreeMetadata;
    }
  } catch {
    // Layout file missing or corrupt
  }
  return null;
}

/** Remove .aui/layouts/<id>.json and update the index */
export async function deleteLayout(projectPath: string, layoutId: string): Promise<void> {
  const path = join(layoutsDir(projectPath), `${layoutId}.json`);
  if (await exists(path)) {
    await remove(path);
  }
  const index = await loadLayoutIndex(projectPath);
  if (index) {
    index.layouts = index.layouts.filter((l) => l.id !== layoutId);
    if (index.activeLayoutId === layoutId && index.layouts.length > 0) {
      index.activeLayoutId = index.layouts[0].id;
    }
    await saveLayoutIndex(projectPath, index);
  }
}

/** Rename a layout in the index */
export async function renameLayout(
  projectPath: string,
  layoutId: string,
  newName: string,
): Promise<void> {
  const index = await loadLayoutIndex(projectPath);
  if (!index) return;
  const entry = index.layouts.find((l) => l.id === layoutId);
  if (entry) {
    entry.name = newName;
    entry.lastModified = Date.now();
    await saveLayoutIndex(projectPath, index);
  }
}
