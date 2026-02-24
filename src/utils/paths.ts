/**
 * Path utilities — no Node.js dependencies.
 */

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export function getFileName(p: string): string {
  const normalized = normalizePath(p);
  const base = normalized.split("/").pop() ?? "";
  const dotIndex = base.lastIndexOf(".");
  return dotIndex > 0 ? base.slice(0, dotIndex) : base;
}

export function titleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateNodeId(filePath: string): string {
  const normalized = normalizePath(filePath);
  // Simple djb2-style hash to produce a deterministic short ID
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((p) => normalizePath(p))
    .join("/")
    .replace(/\/+/g, "/");
}

/** Alias for joinPath — used by tree-store */
export const join = joinPath;
