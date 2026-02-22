// 模块声明
pub mod checksum;
pub mod file_system;
pub mod network;
pub mod zip;

// 重新导出所有 Tauri 命令，方便在 lib.rs 中统一注册
pub use checksum::{calculate_checksums, save_checksums_to_file};
pub use file_system::{
    get_app_exe_path, 
    get_app_exe_folder_path, 
    file_exists, 
    greet, 
    list_bat_files, 
    execute_bat_file, 
    get_launch_options, 
    launch_game,
    list_chart_categories,
    list_charts_in_category,
    delete_chart,
    move_chart,
    create_chart_category,
    create_directory,
    list_skins,
    delete_skin
};
pub use network::{download_file_to_path, fetch_remote_hashes, fetch_chart_list, fetch_github_skins, download_skin_zip, download_charts_batch, clear_api_cache};
pub use zip::{extract_zip, download_and_extract};
