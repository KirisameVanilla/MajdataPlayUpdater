use std::path::Path;
use sha2::{Sha256, Digest};
use tokio::fs;
use tokio::io::AsyncReadExt;
use crate::models::FileChecksum;

/// 计算单个文件的SHA256校验和
async fn get_file_checksum(file_path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(file_path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8192];
    
    loop {
        let n = file.read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        if n == 0 {
            break;
        }
        
        hasher.update(&buffer[..n]);
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// 遍历文件夹并计算所有文件的校验和
async fn calculate_checksums_recursive(
    directory: &Path,
    root_dir: &Path,
    exclude_files: &[String],
) -> Result<Vec<FileChecksum>, String> {
    let mut result = Vec::new();
    
    let mut entries = fs::read_dir(directory)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    while let Some(entry) = entries.next_entry()
        .await
        .map_err(|e| format!("Failed to read entry: {}", e))? {
        
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // 如果在根目录，检查排除列表
        if directory == root_dir && exclude_files.contains(&file_name) {
            continue;
        }
        
        let metadata = entry.metadata()
            .await
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        
        if metadata.is_dir() {
            // 递归处理子目录
            let sub_results = Box::pin(calculate_checksums_recursive(&path, root_dir, exclude_files)).await?;
            result.extend(sub_results);
        } else {
            // 计算文件校验和
            let checksum = get_file_checksum(&path).await?;
            
            // 获取相对于根目录的路径
            let relative_path = path.strip_prefix(root_dir)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;
            
            result.push(FileChecksum {
                name: file_name,
                file_path: relative_path.to_string_lossy().to_string().replace("\\", "/"),
                checksum,
            });
        }
    }
    
    Ok(result)
}

/// Tauri命令：计算目录下所有文件的校验和
#[tauri::command]
pub async fn calculate_checksums(directory: String, exclude_files: Vec<String>) -> Result<Vec<FileChecksum>, String> {
    let dir_path = Path::new(&directory);
    
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", directory));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory));
    }
    
    calculate_checksums_recursive(dir_path, dir_path, &exclude_files).await
}

/// Tauri命令：保存校验和结果到文件
#[tauri::command]
pub async fn save_checksums_to_file(
    directory: String,
    output_file: String,
    exclude_files: Vec<String>,
) -> Result<String, String> {
    let checksums = calculate_checksums(directory.clone(), exclude_files).await?;
    
    let json = serde_json::to_string_pretty(&checksums)
        .map_err(|e| format!("Failed to serialize checksums: {}", e))?;
    
    let output_path = Path::new(&directory).join(&output_file);
    
    fs::write(&output_path, json)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(format!("Checksums saved to {}", output_path.to_string_lossy()))
}
