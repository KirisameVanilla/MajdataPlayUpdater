use std::path::Path;
use tokio::fs;
use crate::commands::network::download_file_impl;

/// Tauri命令：解压ZIP文件
#[tauri::command]
pub fn extract_zip(zip_path: String, target_dir: String) -> Result<String, String> {
    tracing::info!("开始解压 ZIP 文件: {} -> {}", zip_path, target_dir);
    let start_time = std::time::Instant::now();
    
    let file = std::fs::File::open(&zip_path)
        .map_err(|e| {
            tracing::error!("打开 ZIP 文件失败: {}", e);
            format!("Failed to open zip file: {}", e)
        })?;
    
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| {
            tracing::error!("读取 ZIP 文件失败: {}", e);
            format!("Failed to read zip archive: {}", e)
        })?;
    
    let total_files = archive.len();
    tracing::debug!("ZIP 文件包含 {} 个条目", total_files);
    
    // 获取 zip 文件的根目录名称（通常是 MajdataPlay_Build-master）
    let root_folder = if archive.len() > 0 {
        let first_file = archive.by_index(0)
            .map_err(|e| format!("Failed to read first entry: {}", e))?;
        let path = first_file.name();
        path.split('/').next().unwrap_or("").to_string()
    } else {
        String::new()
    };
    
    if !root_folder.is_empty() {
        tracing::debug!("ZIP 根目录: {}", root_folder);
    }
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;
        
        let mut outpath = Path::new(&target_dir).to_path_buf();
        
        // 去掉根文件夹，直接解压到目标目录
        let file_path = file.name();
        if let Some(stripped) = file_path.strip_prefix(&format!("{}/", root_folder)) {
            outpath.push(stripped);
        } else {
            outpath.push(file_path);
        }
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }
    
    let elapsed = start_time.elapsed();
    tracing::info!("解压完成，共 {} 个文件，耗时: {:.2}秒", total_files, elapsed.as_secs_f64());
    
    Ok(format!("Extracted {} files to {}", total_files, target_dir))
}

/// Tauri命令：下载并解压文件
#[tauri::command]
pub async fn download_and_extract(url: String, target_path: String, zip_path: String, proxy: Option<String>) -> Result<String, String> {
    tracing::info!("开始下载并解压: {} -> {}", url, target_path);
    let start_time = std::time::Instant::now();
    
    tracing::debug!("创建目标目录: {}", target_path);
    fs::create_dir_all(&target_path)
        .await
        .map_err(|e| {
            tracing::error!("创建目标目录失败: {}", e);
            format!("Failed to create target directory: {}", e)
        })?;
    
    // 下载文件
    download_file_impl(url, zip_path.clone(), proxy).await?;
    
    // 解压文件
    tracing::info!("开始解压 ZIP 文件...");
    let extract_result = extract_zip(zip_path.clone(), target_path)?;
    
    // 删除 ZIP 文件
    tracing::debug!("删除临时 ZIP 文件: {}", zip_path);
    fs::remove_file(&zip_path)
        .await
        .map_err(|e| {
            tracing::error!("删除 ZIP 文件失败: {}", e);
            format!("Failed to remove zip file: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("下载并解压完成，总耗时: {:.2}秒", elapsed.as_secs_f64());
    
    Ok(extract_result)
}
