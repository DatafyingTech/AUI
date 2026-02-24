// Browser stub for Node.js 'fs' module.
// gray-matter imports fs at top level but only uses it for file-path mode.
// We always pass strings to gray-matter, so these stubs are never called.

export function readFileSync(): never {
  throw new Error("fs.readFileSync is not available in the browser. Use @tauri-apps/plugin-fs instead.");
}

export function existsSync(): boolean {
  return false;
}

export default { readFileSync, existsSync };
