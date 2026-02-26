/**
 * Scheduler service — creates/deletes OS-level scheduled tasks via Tauri commands.
 * Persists schedule metadata to .aui/schedules.json and deploy scripts to .aui/schedules/.
 */
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@/utils/paths";

export interface ScheduleRecord {
  id: string;
  teamId: string;
  teamName: string;
  taskName: string;
  cron: string;
  repeat: string;
  prompt: string;
  scriptPath: string;
  primerPath: string;
  enabled: boolean;
  createdAt: number;
}

function generateTaskName(teamName: string): string {
  const slug = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-${Date.now().toString(36)}`;
}

/** Parse a cron expression into start_time (HH:MM) and repeat type for schtasks. */
function parseCronForOs(cron: string): { startTime: string; repeat: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return { startTime: "09:00", repeat: "once" };

  const [min, hour, dayOfMonth, , dayOfWeek] = parts;

  // Determine repeat type
  let repeat = "daily";
  if (hour === "*") {
    repeat = "hourly";
  } else if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    repeat = "weekly";
  } else if (dayOfMonth !== "*" && dayOfMonth !== "?") {
    repeat = "monthly";
  }

  // Build HH:MM
  const h = hour === "*" ? "0" : hour.replace(/\*\//, "");
  const m = min === "*" ? "0" : min.replace(/\*\//, "");
  const startTime = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;

  return { startTime, repeat };
}

function getTodayDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

async function ensureDir(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

/** Read all schedule records from .aui/schedules.json */
export async function loadSchedules(projectPath: string): Promise<ScheduleRecord[]> {
  try {
    const path = join(projectPath, ".aui", "schedules.json");
    if (await exists(path)) {
      const raw = await readTextFile(path);
      return JSON.parse(raw) as ScheduleRecord[];
    }
  } catch {
    // Start with empty
  }
  return [];
}

/** Save schedule records to .aui/schedules.json */
export async function saveSchedules(
  projectPath: string,
  records: ScheduleRecord[],
): Promise<void> {
  const auiDir = join(projectPath, ".aui");
  await ensureDir(auiDir);
  const path = join(auiDir, "schedules.json");
  await writeTextFile(path, JSON.stringify(records, null, 2));
}

/**
 * Create a scheduled deployment.
 * Writes a deploy script, registers it with the OS task scheduler, and saves metadata.
 */
export async function createSchedule(
  projectPath: string,
  teamId: string,
  teamName: string,
  cron: string,
  repeat: string,
  primerContent: string,
  prompt: string,
  deployScriptPath?: string,
): Promise<ScheduleRecord> {
  const auiDir = join(projectPath, ".aui");
  const schedulesDir = join(auiDir, "schedules");
  await ensureDir(schedulesDir);

  const taskName = generateTaskName(teamName);
  const { startTime } = parseCronForOs(cron);
  const startDate = getTodayDate();

  // Save the primer
  const primerPath = join(schedulesDir, `${taskName}-primer.md`);
  await writeTextFile(primerPath, primerContent);

  // Detect platform
  const isWindows =
    navigator.userAgent.includes("Windows") || navigator.platform.startsWith("Win");

  let scriptPath: string;

  if (isWindows) {
    // Write a .ps1 script
    scriptPath = join(schedulesDir, `${taskName}.ps1`);
    const escapedName = teamName.replace(/'/g, "''");
    let ps1Content: string;

    if (deployScriptPath) {
      // Pipeline: run deploy script directly (no Claude intermediary)
      const winDeployPath = deployScriptPath.replace(/\//g, "\\").replace(/'/g, "''");
      ps1Content = [
        `Remove-Item Env:CLAUDECODE -ErrorAction SilentlyContinue`,
        `Write-Host 'Scheduled pipeline deployment: ${escapedName}' -ForegroundColor Cyan`,
        `Write-Host 'Running deploy script...' -ForegroundColor Green`,
        `& '${winDeployPath}'`,
      ].join("\r\n");
    } else {
      // Team: use Claude with primer
      const winPrimerPath = primerPath.replace(/\//g, "\\");
      const escapedPrimerPath = winPrimerPath.replace(/'/g, "''");
      ps1Content = [
        `Remove-Item Env:CLAUDECODE -ErrorAction SilentlyContinue`,
        `Write-Host 'Scheduled deployment: ${escapedName}' -ForegroundColor Cyan`,
        `Write-Host 'Primer: ${escapedPrimerPath}' -ForegroundColor Yellow`,
        `Write-Host 'Starting Claude...' -ForegroundColor Green`,
        `try {`,
        `  claude --dangerously-skip-permissions "Read the deployment primer at '${escapedPrimerPath}' using the Read tool and follow ALL instructions in it exactly. Start immediately."`,
        `} catch {`,
        `  Write-Host "Error: $_" -ForegroundColor Red`,
        `}`,
      ].join("\r\n");
    }
    await writeTextFile(scriptPath, "\uFEFF" + ps1Content);

    // Convert to Windows path for schtasks
    const winScriptPath = scriptPath.replace(/\//g, "\\");

    // Create OS scheduled task
    await invoke("create_scheduled_task", {
      taskName,
      scriptPath: winScriptPath,
      startTime,
      startDate,
      repeat,
    });
  } else {
    // Write a .sh script
    scriptPath = join(schedulesDir, `${taskName}.sh`);
    let shContent: string;

    if (deployScriptPath) {
      // Pipeline: run deploy script directly
      const escapedDeployPath = deployScriptPath.replace(/'/g, "'\\''");
      shContent = [
        "#!/bin/bash",
        "unset CLAUDECODE",
        `echo 'Scheduled pipeline deployment: ${teamName.replace(/'/g, "'\\''")}'`,
        `bash '${escapedDeployPath}'`,
      ].join("\n");
    } else {
      // Team: use Claude with primer
      const escapedPrimerPathUnix = primerPath.replace(/'/g, "'\\''");
      shContent = [
        "#!/bin/bash",
        "unset CLAUDECODE",
        `echo 'Scheduled deployment: ${teamName.replace(/'/g, "'\\''")}'`,
        `claude --dangerously-skip-permissions "Read the deployment primer at '${escapedPrimerPathUnix}' using the Read tool and follow ALL instructions in it exactly. Start immediately."`,
      ].join("\n");
    }
    await writeTextFile(scriptPath, shContent);

    // Create OS cron job
    await invoke("create_scheduled_task", {
      taskName,
      scriptPath,
      startTime,
      startDate,
      repeat,
    });
  }

  const record: ScheduleRecord = {
    id: taskName,
    teamId,
    teamName,
    taskName,
    cron,
    repeat,
    prompt,
    scriptPath,
    primerPath,
    enabled: true,
    createdAt: Date.now(),
  };

  // Append to schedules.json
  const existing = await loadSchedules(projectPath);
  existing.push(record);
  await saveSchedules(projectPath, existing);

  return record;
}

/** Delete a scheduled deployment — removes OS task and metadata. */
export async function deleteSchedule(
  projectPath: string,
  scheduleId: string,
): Promise<void> {
  const records = await loadSchedules(projectPath);
  const record = records.find((r) => r.id === scheduleId);

  if (record) {
    try {
      await invoke("delete_scheduled_task", { taskName: record.taskName });
    } catch {
      // Task may already be deleted from OS — continue cleanup
    }
  }

  const updated = records.filter((r) => r.id !== scheduleId);
  await saveSchedules(projectPath, updated);
}

/** Toggle enabled/disabled — deletes or recreates the OS task accordingly. */
export async function toggleSchedule(
  projectPath: string,
  scheduleId: string,
): Promise<ScheduleRecord[]> {
  const records = await loadSchedules(projectPath);
  const idx = records.findIndex((r) => r.id === scheduleId);
  if (idx === -1) return records;

  const record = records[idx];
  const newEnabled = !record.enabled;

  if (!newEnabled) {
    // Disable: delete the OS task but keep the record
    try {
      await invoke("delete_scheduled_task", { taskName: record.taskName });
    } catch {
      // Already deleted or never existed
    }
  } else {
    // Re-enable: recreate the OS task
    const { startTime } = parseCronForOs(record.cron);
    const startDate = getTodayDate();

    const isWindows =
      navigator.userAgent.includes("Windows") || navigator.platform.startsWith("Win");
    const scriptPathForOs = isWindows
      ? record.scriptPath.replace(/\//g, "\\")
      : record.scriptPath;

    await invoke("create_scheduled_task", {
      taskName: record.taskName,
      scriptPath: scriptPathForOs,
      startTime,
      startDate,
      repeat: record.repeat,
    });
  }

  records[idx] = { ...record, enabled: newEnabled };
  await saveSchedules(projectPath, records);
  return records;
}

/** Query the OS to see which AUI tasks actually exist. */
export async function listOsTasks(): Promise<string> {
  return await invoke<string>("list_scheduled_tasks");
}
