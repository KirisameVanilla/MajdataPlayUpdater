// 模块声明
mod models;
mod commands;

// 导入所有命令
use commands::*;

/// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // 文件系统相关命令
            greet, 
            get_app_exe_path, 
            get_app_exe_folder_path,
            file_exists,
            list_bat_files,
            execute_bat_file,
            get_launch_options,
            launch_game,
            // 校验和相关命令
            calculate_checksums,
            save_checksums_to_file,
            // ZIP相关命令
            extract_zip,
            download_and_extract,
            // 网络相关命令
            download_file_to_path,
            fetch_remote_hashes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

