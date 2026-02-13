use std::path::Path;
use tokio::fs;
use crate::models::FileChecksum;

/// 创建 HTTP 客户端，支持代理和重定向
pub fn create_http_client(proxy: Option<String>) -> Result<reqwest::Client, String> {
    let mut client_builder = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))  // 支持最多10次重定向
        .timeout(std::time::Duration::from_secs(300));  // 5分钟超时
    
    if let Some(proxy_url) = proxy {
        if !proxy_url.is_empty() {
            let proxy = reqwest::Proxy::all(&proxy_url)
                .map_err(|e| format!("Invalid proxy URL: {}", e))?;
            client_builder = client_builder.proxy(proxy);
        }
    }
    
    client_builder.build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))
}

/// 下载文件到指定路径（内部共享函数）
/// 被 download_file_to_path 和 download_and_extract 复用
pub async fn download_file_impl(url: String, output_path: String, proxy: Option<String>) -> Result<String, String> {
    let client = create_http_client(proxy)?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    fs::write(&output_path, &bytes)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(format!("Downloaded to {}", output_path))
}

/// Tauri命令：下载单个文件到指定位置
/// 复用 download_file_impl，添加父目录创建逻辑
#[tauri::command]
pub async fn download_file_to_path(url: String, file_path: String, target_dir: String, proxy: Option<String>) -> Result<String, String> {
    let full_path = Path::new(&target_dir).join(&file_path);
    
    // 确保父目录存在
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }
    
    // 复用基础下载函数
    download_file_impl(url, full_path.to_string_lossy().to_string(), proxy).await
}

/// Tauri命令：获取远程哈希文件
#[tauri::command]
pub async fn fetch_remote_hashes(url: String, proxy: Option<String>) -> Result<Vec<FileChecksum>, String> {
    let client = create_http_client(proxy)?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch remote hashes: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to fetch remote hashes with status: {}", response.status()));
    }
    
    let hashes: Vec<FileChecksum> = response.json()
        .await
        .map_err(|e| format!("Failed to parse remote hashes JSON: {}", e))?;
    
    Ok(hashes)
}
