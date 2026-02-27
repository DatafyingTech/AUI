use std::process::Command as StdCommand;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Creates a scheduled task that runs a PowerShell script at the specified time.
/// On Windows, uses schtasks.exe. On macOS/Linux, uses crontab.
#[tauri::command]
fn create_scheduled_task(
    task_name: String,
    script_path: String,
    start_time: String,
    start_date: String,
    repeat: String,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let tn = format!("AUI\\{}", task_name);
        let tr = format!(
            "powershell.exe -ExecutionPolicy Bypass -File \"{}\"",
            script_path
        );

        // Map repeat type to schtasks /SC value
        let sc = match repeat.as_str() {
            "hourly" => "HOURLY",
            "daily" => "DAILY",
            "weekly" => "WEEKLY",
            "monthly" => "MONTHLY",
            _ => "ONCE",
        };

        let mut args = vec![
            "/Create".to_string(),
            "/TN".to_string(),
            tn.clone(),
            "/TR".to_string(),
            tr,
            "/SC".to_string(),
            sc.to_string(),
            "/ST".to_string(),
            start_time.clone(),
            "/F".to_string(), // Force overwrite if exists
        ];

        // Add start date for non-hourly schedules
        if sc != "HOURLY" && !start_date.is_empty() {
            args.push("/SD".to_string());
            args.push(start_date.clone());
        }

        let output = StdCommand::new("schtasks.exe")
            .args(&args)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| format!("Failed to run schtasks: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("schtasks failed: {}", stderr));
        }

        Ok(format!("Created scheduled task: {}", tn))
    }

    #[cfg(not(target_os = "windows"))]
    {
        // macOS/Linux: append a crontab entry
        // Convert our repeat + time into a cron expression
        let cron_line = match repeat.as_str() {
            "hourly" => format!("0 * * * *"),
            "daily" => {
                let parts: Vec<&str> = start_time.split(':').collect();
                let hour = parts.get(0).unwrap_or(&"9");
                let min = parts.get(1).unwrap_or(&"0");
                format!("{} {} * * *", min, hour)
            }
            "weekly" => {
                let parts: Vec<&str> = start_time.split(':').collect();
                let hour = parts.get(0).unwrap_or(&"9");
                let min = parts.get(1).unwrap_or(&"0");
                format!("{} {} * * 1", min, hour)
            }
            "monthly" => {
                let parts: Vec<&str> = start_time.split(':').collect();
                let hour = parts.get(0).unwrap_or(&"9");
                let min = parts.get(1).unwrap_or(&"0");
                format!("{} {} 1 * *", min, hour)
            }
            _ => {
                // ONCE: use `at` or a one-shot cron
                let parts: Vec<&str> = start_time.split(':').collect();
                let hour = parts.get(0).unwrap_or(&"9");
                let min = parts.get(1).unwrap_or(&"0");
                format!("{} {} * * *", min, hour)
            }
        };

        let entry = format!(
            "{} /bin/bash '{}' # AUI:{}\n",
            cron_line, script_path, task_name
        );

        // Read existing crontab, append new entry
        let existing = StdCommand::new("crontab")
            .arg("-l")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();

        let new_crontab = format!("{}{}", existing, entry);

        let mut child = StdCommand::new("crontab")
            .arg("-")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to set crontab: {}", e))?;

        use std::io::Write;
        if let Some(ref mut stdin) = child.stdin {
            stdin
                .write_all(new_crontab.as_bytes())
                .map_err(|e| format!("Failed to write crontab: {}", e))?;
        }

        child
            .wait()
            .map_err(|e| format!("crontab process error: {}", e))?;

        Ok(format!("Created cron job: AUI:{}", task_name))
    }
}

/// Lists all AUI scheduled tasks.
/// On Windows, queries schtasks under the AUI\ folder.
/// On macOS/Linux, searches crontab for AUI: markers.
#[tauri::command]
fn list_scheduled_tasks() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = StdCommand::new("schtasks.exe")
            .args(&["/Query", "/FO", "CSV", "/NH", "/TN", "AUI\\*"])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to query schtasks: {}", e))?;

        // schtasks returns non-zero if no tasks found — that's OK
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(stdout)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = StdCommand::new("crontab")
            .arg("-l")
            .output()
            .map_err(|e| format!("Failed to read crontab: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        // Filter to only AUI entries
        let aui_entries: Vec<&str> = stdout
            .lines()
            .filter(|line| line.contains("# AUI:"))
            .collect();
        Ok(aui_entries.join("\n"))
    }
}

/// Deletes a scheduled task by name.
/// On Windows, removes from Task Scheduler. On macOS/Linux, removes from crontab.
#[tauri::command]
fn delete_scheduled_task(task_name: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let tn = format!("AUI\\{}", task_name);
        let output = StdCommand::new("schtasks.exe")
            .args(&["/Delete", "/TN", &tn, "/F"])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to run schtasks: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("schtasks delete failed: {}", stderr));
        }

        Ok(format!("Deleted scheduled task: {}", tn))
    }

    #[cfg(not(target_os = "windows"))]
    {
        let marker = format!("# AUI:{}", task_name);

        let existing = StdCommand::new("crontab")
            .arg("-l")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();

        let filtered: Vec<&str> = existing
            .lines()
            .filter(|line| !line.contains(&marker))
            .collect();
        let new_crontab = format!("{}\n", filtered.join("\n"));

        let mut child = StdCommand::new("crontab")
            .arg("-")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to set crontab: {}", e))?;

        use std::io::Write;
        if let Some(ref mut stdin) = child.stdin {
            stdin
                .write_all(new_crontab.as_bytes())
                .map_err(|e| format!("Failed to write crontab: {}", e))?;
        }

        child
            .wait()
            .map_err(|e| format!("crontab process error: {}", e))?;

        Ok(format!("Deleted cron job: AUI:{}", task_name))
    }
}

/// Opens a visible terminal window running the given script.
/// On Windows, uses CREATE_NEW_CONSOLE to bypass Tauri's CREATE_NO_WINDOW flag.
#[tauri::command]
fn open_terminal(script_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Use `cmd /c start` to launch PowerShell as a fully independent process.
        // Direct spawning via CREATE_NEW_CONSOLE gets killed in the Tauri context.
        // `start` uses ShellExecuteEx internally which fully detaches the process.
        // We use raw_arg to control the exact command line (no Rust auto-quoting).
        let raw = format!(
            "/c start \"Deploy\" powershell.exe -NoExit -ExecutionPolicy Bypass -File \"{}\"",
            script_path
        );
        StdCommand::new("cmd.exe")
            .raw_arg(raw)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW for cmd.exe itself
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let apple_script = format!(
            r#"tell application "Terminal"
            activate
            do script "bash '{}'"
        end tell"#,
            script_path.replace("'", "'\\''")
        );
        StdCommand::new("osascript")
            .args(&["-e", &apple_script])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators in order
        let terminals = [
            ("x-terminal-emulator", vec!["-e", &script_path]),
            ("gnome-terminal", vec!["--", &script_path]),
            ("xterm", vec!["-e", &script_path]),
        ];
        let mut launched = false;
        for (term, args) in &terminals {
            if StdCommand::new(term).args(args).spawn().is_ok() {
                launched = true;
                break;
            }
        }
        if !launched {
            return Err("No terminal emulator found".into());
        }
    }

    Ok(())
}

/// Fetches a URL and returns its body as a string.
/// Bypasses webview CORS/CSP restrictions by running in Rust.
#[tauri::command]
fn fetch_url(url: String) -> Result<String, String> {
    let output = StdCommand::new("curl")
        .args(&["-sL", "--max-time", "15", &url])
        .output()
        .map_err(|e| format!("Failed to run curl: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("HTTP request failed: {}", stderr));
    }

    String::from_utf8(output.stdout)
        .map_err(|e| format!("Invalid UTF-8 in response: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            open_terminal,
            fetch_url,
            create_scheduled_task,
            list_scheduled_tasks,
            delete_scheduled_task,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
