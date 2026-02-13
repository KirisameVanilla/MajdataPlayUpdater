// 模块声明
mod models;
mod commands;

// 导入所有命令
use commands::*;
use tracing_subscriber::{fmt, EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use std::fs::OpenOptions;
use std::io::Write;

/// 简单的线程安全文件写入器包装
#[derive(Clone)]
struct FileWriter {
    file: std::sync::Arc<std::sync::Mutex<std::fs::File>>,
}

impl FileWriter {
    fn new(file: std::fs::File) -> Self {
        Self {
            file: std::sync::Arc::new(std::sync::Mutex::new(file)),
        }
    }
}

impl Write for FileWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.file.lock().unwrap().write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.file.lock().unwrap().flush()
    }
}

/// 初始化日志系统
fn init_logging() {
    // 获取可执行文件所在目录
    let exe_path = std::env::current_exe().ok();
    let log_dir = exe_path
        .as_ref()
        .and_then(|p| p.parent())
        .unwrap_or_else(|| std::path::Path::new("."));
    
    let log_file_path = log_dir.join("MajdataHub.log");
    
    // 创建或覆盖日志文件
    let log_file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_file_path)
        .expect("无法创建日志文件");
    
    let file_writer = FileWriter::new(log_file);
    
    // 创建日志过滤器，默认 info 级别，可通过 RUST_LOG 环境变量覆盖
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    tracing_subscriber::registry()
        .with(filter)
        .with(
            // 输出到文件
            fmt::layer()
                .with_writer(move || file_writer.clone())
                .with_target(true)  // 显示日志来源
                .with_thread_ids(false)  // 不显示线程ID
                .with_file(true)  // 显示文件名
                .with_line_number(true)  // 显示行号
                .with_ansi(false)  // 禁用颜色代码（文件不需要颜色）
        )
        .with(
            // 输出到终端
            fmt::layer()
                .with_writer(std::io::stdout)
                .with_target(true)  // 显示日志来源
                .with_thread_ids(false)  // 不显示线程ID
                .with_file(true)  // 显示文件名
                .with_line_number(true)  // 显示行号
                .with_ansi(true)  // 终端启用颜色代码
        )
        .init();
    
    tracing::info!("日志系统已初始化，日志文件: {:?}", log_file_path);
}

/// Tauri 应用程序入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志系统
    init_logging();
    
    tracing::info!("启动 Majdata Hub 应用程序");
    
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

