use std::env;
use std::path::Path;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};

/// 游戏启动选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchOption {
    pub id: String,
    pub label: String,
    pub description: String,
}

/// 谱面信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartInfo {
    pub name: String,
    pub category: String,
    pub has_bg: bool,
    pub has_track: bool,
    pub has_maidata: bool,
    pub has_video: bool,
}

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

/// Tauri命令：获取游戏启动选项列表（内置）
#[tauri::command]
pub fn get_launch_options() -> Vec<LaunchOption> {
    vec![
        LaunchOption {
            id: "default".to_string(),
            label: "默认启动".to_string(),
            description: "使用默认设置启动游戏".to_string(),
        },
        LaunchOption {
            id: "d3d11".to_string(),
            label: "强制使用 D3D11".to_string(),
            description: "强制使用 Direct3D 11 渲染".to_string(),
        },
        LaunchOption {
            id: "d3d12".to_string(),
            label: "强制使用 D3D12".to_string(),
            description: "强制使用 Direct3D 12 渲染".to_string(),
        },
        LaunchOption {
            id: "opengl".to_string(),
            label: "强制使用 OpenGL".to_string(),
            description: "强制使用 OpenGL Core 渲染".to_string(),
        },
        LaunchOption {
            id: "vulkan".to_string(),
            label: "强制使用 Vulkan".to_string(),
            description: "强制使用 Vulkan 渲染".to_string(),
        },
        LaunchOption {
            id: "test".to_string(),
            label: "测试模式".to_string(),
            description: "进入游戏测试模式".to_string(),
        },
        LaunchOption {
            id: "edit".to_string(),
            label: "MajdataEdit".to_string(),
            description: "打开谱面编辑器".to_string(),
        },
    ]
}

/// Tauri命令：根据启动选项ID启动游戏
#[tauri::command]
pub fn launch_game(game_dir: String, option_id: String) -> Result<(), String> {
    tracing::info!("准备启动游戏，游戏目录: {}，启动选项: {}", game_dir, option_id);
    
    let game_exe = Path::new(&game_dir).join("MajdataPlay.exe");
    
    if !game_exe.exists() {
        tracing::error!("游戏程序不存在: {:?}", game_exe);
        return Err(format!("游戏程序不存在: {}", game_exe.display()));
    }
    
    #[cfg(target_os = "windows")]
    {
        let args: Vec<&str> = match option_id.as_str() {
            "default" => vec![],
            "d3d11" => vec!["-force-d3d11"],
            "d3d12" => vec!["-force-d3d12"],
            "opengl" => vec!["-force-glcore"],
            "vulkan" => vec!["-force-vulkan"],
            "test" => vec!["--test-mode"],
            "edit" => vec!["--view-mode"],
            _ => {
                tracing::error!("未知的启动选项: {}", option_id);
                return Err(format!("未知的启动选项: {}", option_id));
            }
        };
        
        tracing::info!("使用参数启动游戏: {:?}", args);
        
        // 启动游戏
        match Command::new(&game_exe)
            .args(&args)
            .current_dir(&game_dir)
            .spawn()
        {
            Ok(_) => {
                tracing::info!("游戏启动成功");
                // 如果是编辑模式，等待一下然后启动编辑器
                if option_id == "edit" {
                    // 注意：这里只启动游戏，编辑器需要用户手动启动
                    // 或者可以提示用户等待游戏打开后再启动编辑器
                }
                Ok(())
            },
            Err(e) => {
                tracing::error!("启动游戏失败: {}", e);
                Err(format!("启动游戏失败: {}", e))
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅在 Windows 上可用".to_string())
    }
}

/// Tauri命令：列出指定目录下的所有 .bat 文件（已弃用，保留用于兼容）
#[tauri::command]
pub fn list_bat_files(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    
    if !path.exists() {
        return Err(format!("目录不存在: {}", dir_path));
    }
    
    if !path.is_dir() {
        return Err(format!("路径不是目录: {}", dir_path));
    }
    
    let mut bat_files = Vec::new();
    
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Some(filename) = entry.file_name().to_str() {
                        if filename.ends_with(".bat") {
                            bat_files.push(filename.to_string());
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("读取目录失败: {}", e)),
    }
    
    bat_files.sort();
    Ok(bat_files)
}

/// Tauri命令：执行指定的 .bat 文件（已弃用，保留用于兼容）
#[tauri::command]
pub fn execute_bat_file(dir_path: String, bat_file: String) -> Result<(), String> {
    tracing::info!("执行 BAT 文件: {}/{}", dir_path, bat_file);
    
    let bat_path = Path::new(&dir_path).join(&bat_file);
    
    if !bat_path.exists() {
        tracing::error!("BAT 文件不存在: {:?}", bat_path);
        return Err(format!("BAT 文件不存在: {}", bat_path.display()));
    }
    
    #[cfg(target_os = "windows")]
    {
        match Command::new("cmd")
            .args(&["/C", "start", "", bat_path.to_str().unwrap()])
            .current_dir(&dir_path)
            .spawn()
        {
            Ok(_) => {
                tracing::info!("BAT 文件执行成功");
                Ok(())
            },
            Err(e) => {
                tracing::error!("执行 BAT 文件失败: {}", e);
                Err(format!("执行 BAT 文件失败: {}", e))
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅在 Windows 上可用".to_string())
    }
}

/// Tauri命令：列出所有谱面分类
#[tauri::command]
pub fn list_chart_categories(maicharts_dir: String) -> Result<Vec<String>, String> {
    let path = Path::new(&maicharts_dir);
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    if !path.is_dir() {
        return Err(format!("路径不是目录: {}", maicharts_dir));
    }
    
    let mut categories = Vec::new();
    
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    if entry.path().is_dir() {
                        if let Some(name) = entry.file_name().to_str() {
                            categories.push(name.to_string());
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("读取目录失败: {}", e)),
    }
    
    categories.sort();
    Ok(categories)
}

/// Tauri命令：列出某个分类下的所有谱面
#[tauri::command]
pub fn list_charts_in_category(maicharts_dir: String, category: String) -> Result<Vec<ChartInfo>, String> {
    let category_path = Path::new(&maicharts_dir).join(&category);
    
    if !category_path.exists() {
        return Ok(Vec::new());
    }
    
    if !category_path.is_dir() {
        return Err(format!("分类路径不是目录: {}", category_path.display()));
    }
    
    let mut charts = Vec::new();
    
    match fs::read_dir(&category_path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    if entry.path().is_dir() {
                        if let Some(name) = entry.file_name().to_str() {
                            let chart_path = entry.path();
                            
                            charts.push(ChartInfo {
                                name: name.to_string(),
                                category: category.clone(),
                                has_bg: chart_path.join("bg.jpg").exists() || chart_path.join("bg.png").exists(),
                                has_track: chart_path.join("track.mp3").exists() || chart_path.join("track.ogg").exists(),
                                has_maidata: chart_path.join("maidata.txt").exists(),
                                has_video: chart_path.join("pv.mp4").exists() || chart_path.join("bg.mp4").exists(),
                            });
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("读取目录失败: {}", e)),
    }
    
    charts.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(charts)
}

/// Tauri命令：删除谱面
#[tauri::command]
pub fn delete_chart(maicharts_dir: String, category: String, chart_name: String) -> Result<(), String> {
    let chart_path = Path::new(&maicharts_dir).join(&category).join(&chart_name);
    
    if !chart_path.exists() {
        return Err(format!("谱面不存在: {}", chart_path.display()));
    }
    
    if !chart_path.is_dir() {
        return Err(format!("路径不是目录: {}", chart_path.display()));
    }
    
    match fs::remove_dir_all(&chart_path) {
        Ok(_) => {
            tracing::info!("删除谱面成功: {:?}", chart_path);
            Ok(())
        },
        Err(e) => {
            tracing::error!("删除谱面失败: {}", e);
            Err(format!("删除谱面失败: {}", e))
        }
    }
}

/// Tauri命令：移动谱面到另一个分类
#[tauri::command]
pub fn move_chart(maicharts_dir: String, from_category: String, to_category: String, chart_name: String) -> Result<(), String> {
    let from_path = Path::new(&maicharts_dir).join(&from_category).join(&chart_name);
    let to_category_path = Path::new(&maicharts_dir).join(&to_category);
    let to_path = to_category_path.join(&chart_name);
    
    if !from_path.exists() {
        return Err(format!("源谱面不存在: {}", from_path.display()));
    }
    
    // 确保目标分类存在
    if !to_category_path.exists() {
        fs::create_dir_all(&to_category_path)
            .map_err(|e| format!("创建目标分类失败: {}", e))?;
    }
    
    // 检查目标位置是否已存在同名谱面
    if to_path.exists() {
        return Err(format!("目标位置已存在同名谱面: {}", to_path.display()));
    }
    
    match fs::rename(&from_path, &to_path) {
        Ok(_) => {
            tracing::info!("移动谱面成功: {:?} -> {:?}", from_path, to_path);
            Ok(())
        },
        Err(e) => {
            tracing::error!("移动谱面失败: {}", e);
            Err(format!("移动谱面失败: {}", e))
        }
    }
}

/// Tauri命令：创建新的谱面分类
#[tauri::command]
pub fn create_chart_category(maicharts_dir: String, category: String) -> Result<(), String> {
    let category_path = Path::new(&maicharts_dir).join(&category);
    
    if category_path.exists() {
        return Err(format!("分类已存在: {}", category));
    }
    
    match fs::create_dir_all(&category_path) {
        Ok(_) => {
            tracing::info!("创建分类成功: {:?}", category_path);
            Ok(())
        },
        Err(e) => {
            tracing::error!("创建分类失败: {}", e);
            Err(format!("创建分类失败: {}", e))
        }
    }
}

/// Tauri命令：创建目录
#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    let dir_path = Path::new(&path);
    
    match fs::create_dir_all(&dir_path) {
        Ok(_) => {
            tracing::info!("创建目录成功: {:?}", dir_path);
            Ok(())
        },
        Err(e) => {
            tracing::error!("创建目录失败: {}", e);
            Err(format!("创建目录失败: {}", e))
        }
    }
}
