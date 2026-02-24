use std::process::Command as StdCommand;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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
        StdCommand::new("open")
            .args(&["-a", "Terminal", &script_path])
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
        .invoke_handler(tauri::generate_handler![open_terminal, fetch_url])
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
