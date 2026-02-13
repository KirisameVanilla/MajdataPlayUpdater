use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};
use std::fs;
use std::io::Read;
use rayon::prelude::*;
use walkdir::WalkDir;
use crate::models::FileChecksum;

/// 计算单个文件的SHA256校验和（同步版本，用于并行处理）
fn get_file_checksum_sync(file_path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut hasher = Sha256::new();
    // 使用更大的缓冲区提高性能
    let mut buffer = vec![0u8; 65536]; // 64KB
    let mut total_bytes = 0u64;
    
    loop {
        let n = file.read(&mut buffer)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        if n == 0 {
            break;
        }
        
        hasher.update(&buffer[..n]);
        total_bytes += n as u64;
    }
    
    let checksum = format!("{:x}", hasher.finalize());
    tracing::trace!("计算文件校验和: {:?} ({} bytes) -> {}", file_path.file_name(), total_bytes, checksum);
    
    Ok(checksum)
}

/// 收集目录中所有需要计算校验和的文件路径
fn collect_files(
    directory: &Path,
    root_dir: &Path,
    exclude_files: &[String],
) -> Result<Vec<PathBuf>, String> {
    tracing::debug!("收集文件列表...");
    
    let files: Vec<PathBuf> = WalkDir::new(directory)
        .into_iter()
        .filter_entry(|e| {
            // 如果是根目录下的文件/文件夹，检查是否在排除列表中
            if let Some(parent) = e.path().parent() {
                if parent == root_dir {
                    let name = e.file_name().to_string_lossy().to_string();
                    return !exclude_files.contains(&name);
                }
            }
            true
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.path().to_path_buf())
        .collect();
    
    tracing::info!("找到 {} 个文件需要计算校验和", files.len());
    Ok(files)
}

/// Tauri命令：计算目录下所有文件的校验和（并行优化版本）
#[tauri::command]
pub async fn calculate_checksums(directory: String, exclude_files: Vec<String>) -> Result<Vec<FileChecksum>, String> {
    tracing::info!("开始计算目录校验和: {}", directory);
    tracing::debug!("排除文件: {:?}", exclude_files);
    let start_time = std::time::Instant::now();
    
    let dir_path = Path::new(&directory);
    
    if !dir_path.exists() {
        tracing::error!("目录不存在: {}", directory);
        return Err(format!("Directory does not exist: {}", directory));
    }
    
    if !dir_path.is_dir() {
        tracing::error!("路径不是目录: {}", directory);
        return Err(format!("Path is not a directory: {}", directory));
    }
    
    // 在独立线程中执行 CPU 密集型操作，避免阻塞 tokio 运行时
    let dir_path_owned = dir_path.to_path_buf();
    let result = tokio::task::spawn_blocking(move || {
        // 先收集所有文件路径
        let files = collect_files(&dir_path_owned, &dir_path_owned, &exclude_files)?;
        
        let collection_time = start_time.elapsed();
        tracing::debug!("文件收集完成，耗时: {:.2}秒", collection_time.as_secs_f64());
        
        // 使用 rayon 并行计算所有文件的校验和
        tracing::info!("开始并行计算校验和...");
        let results: Result<Vec<FileChecksum>, String> = files
            .par_iter()
            .map(|file_path| {
                let checksum = get_file_checksum_sync(file_path)?;
                
                let file_name = file_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                
                let relative_path = file_path
                    .strip_prefix(&dir_path_owned)
                    .map_err(|e| format!("Failed to get relative path: {}", e))?;
                
                Ok(FileChecksum {
                    name: file_name,
                    file_path: relative_path.to_string_lossy().to_string().replace("\\", "/"),
                    checksum,
                })
            })
            .collect();
        
        results
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;
    
    let elapsed = start_time.elapsed();
    tracing::info!("校验和计算完成，共 {} 个文件，耗时: {:.2}秒", result.len(), elapsed.as_secs_f64());
    
    Ok(result)
}

/// Tauri命令：保存校验和结果到文件
#[tauri::command]
pub async fn save_checksums_to_file(
    directory: String,
    output_file: String,
    exclude_files: Vec<String>,
) -> Result<String, String> {
    tracing::info!("保存校验和到文件: {}/{}", directory, output_file);
    
    let checksums = calculate_checksums(directory.clone(), exclude_files).await?;
    
    tracing::debug!("序列化校验和数据...");
    let json = serde_json::to_string_pretty(&checksums)
        .map_err(|e| {
            tracing::error!("序列化校验和失败: {}", e);
            format!("Failed to serialize checksums: {}", e)
        })?;
    
    let output_path = Path::new(&directory).join(&output_file);
    
    tokio::fs::write(&output_path, json)
        .await
        .map_err(|e| {
            tracing::error!("写入文件失败: {}", e);
            format!("Failed to write file: {}", e)
        })?;
    
    tracing::info!("校验和已保存到: {}", output_path.to_string_lossy());
    Ok(format!("Checksums saved to {}", output_path.to_string_lossy()))
}
