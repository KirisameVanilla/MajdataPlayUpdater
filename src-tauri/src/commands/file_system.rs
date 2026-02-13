use std::env;
use std::path::Path;

/// Tauri命令：获取应用程序可执行文件的完整路径
#[tauri::command]
pub fn get_app_exe_path() -> Result<String, String> {
    env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))
        .and_then(|path| {
            path.to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Invalid path encoding".to_string())
        })
}

/// Tauri命令：获取应用程序可执行文件所在的文件夹路径
#[tauri::command]
pub fn get_app_exe_folder_path() -> Result<String, String> {
    env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))
        .and_then(|path| {
            path.parent()
                .and_then(|p| p.to_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "Invalid path encoding".to_string())
        })
}

/// Tauri命令：检查文件是否存在
#[tauri::command]
pub fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Tauri命令：示例问候命令
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
