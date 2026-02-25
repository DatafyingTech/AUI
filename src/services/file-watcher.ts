import { watch } from "@tauri-apps/plugin-fs";
import { joinPath, normalizePath } from "@/utils/paths";

/**
 * Watch the .claude/ directory for changes with debouncing.
 * Returns a cleanup function that stops watching.
 */
export async function startWatching(
  rootPath: string,
  onChange: (paths: string[]) => void
): Promise<() => void> {
  const claudeDir = joinPath(normalizePath(rootPath), ".claude");

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingPaths: string[] = [];

  const unwatch = await watch(
    claudeDir,
    (event) => {
      const eventPaths = event.paths.map(normalizePath);
      pendingPaths.push(...eventPaths);

      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        const paths = [...new Set(pendingPaths)];
        pendingPaths = [];
        debounceTimer = null;
        onChange(paths);
      }, 300);
    },
    { recursive: true }
  );

  return () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    unwatch();
  };
}
