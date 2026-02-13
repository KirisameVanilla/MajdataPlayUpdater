// 模块声明
pub mod checksum;
pub mod file_system;
pub mod network;
pub mod zip;

// 重新导出所有 Tauri 命令，方便在 lib.rs 中统一注册
pub use checksum::{calculate_checksums, save_checksums_to_file};
pub use file_system::{get_app_exe_path, get_app_exe_folder_path, file_exists, greet};
pub use network::{download_file_to_path, fetch_remote_hashes};
pub use zip::{extract_zip, download_and_extract};
