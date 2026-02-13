use std::path::Path;
use tokio::fs;
use crate::models::FileChecksum;

/// 创建 HTTP 客户端，支持代理和重定向
pub fn create_http_client(proxy: Option<String>) -> Result<reqwest::Client, String> {
    tracing::debug!("创建 HTTP 客户端, 代理配置: {:?}", proxy);
    
    let mut client_builder = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))  // 支持最多10次重定向
        .timeout(std::time::Duration::from_secs(300));  // 5分钟超时
    
    if let Some(proxy_url) = proxy {
        if !proxy_url.is_empty() {
            let proxy = reqwest::Proxy::all(&proxy_url)
                .map_err(|e| {
                    tracing::error!("无效的代理 URL: {}", e);
                    format!("Invalid proxy URL: {}", e)
                })?;
            client_builder = client_builder.proxy(proxy);
            tracing::info!("已配置代理: {}", proxy_url);
        }
    }
    
    client_builder.build()
        .map_err(|e| {
            tracing::error!("创建 HTTP 客户端失败: {}", e);
            format!("Failed to create HTTP client: {}", e)
        })
}

/// 下载文件到指定路径（内部共享函数）
/// 被 download_file_to_path 和 download_and_extract 复用
pub async fn download_file_impl(url: String, output_path: String, proxy: Option<String>) -> Result<String, String> {
    tracing::info!("开始下载文件: {} -> {}", url, output_path);
    let start_time = std::time::Instant::now();
    
    let client = create_http_client(proxy)?;
    
    tracing::debug!("正在发送 GET 请求...");
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("下载文件失败: {}", e);
            format!("Failed to download file: {}", e)
        })?;
    
    if !response.status().is_success() {
        tracing::error!("下载失败，HTTP 状态码: {}", response.status());
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    tracing::debug!("正在读取响应内容...");
    let bytes = response.bytes()
        .await
        .map_err(|e| {
            tracing::error!("读取响应失败: {}", e);
            format!("Failed to read response: {}", e)
        })?;
    
    let file_size = bytes.len();
    tracing::info!("下载完成，文件大小: {} 字节", file_size);
    
    tracing::debug!("正在写入文件...");
    fs::write(&output_path, &bytes)
        .await
        .map_err(|e| {
            tracing::error!("写入文件失败: {}", e);
            format!("Failed to write file: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("文件下载成功，耗时: {:.2}秒，速度: {:.2} KB/s", 
        elapsed.as_secs_f64(),
        file_size as f64 / 1024.0 / elapsed.as_secs_f64()
    );
    
    Ok(format!("Downloaded to {}", output_path))
}

/// Tauri命令：下载单个文件到指定位置
/// 复用 download_file_impl，添加父目录创建逻辑
#[tauri::command]
pub async fn download_file_to_path(url: String, file_path: String, target_dir: String, proxy: Option<String>) -> Result<String, String> {
    tracing::info!("下载文件到指定路径: {} -> {}/{}", url, target_dir, file_path);
    
    let full_path = Path::new(&target_dir).join(&file_path);
    
    // 确保父目录存在
    if let Some(parent) = full_path.parent() {
        tracing::debug!("创建父目录: {:?}", parent);
        fs::create_dir_all(parent)
            .await
            .map_err(|e| {
                tracing::error!("创建父目录失败: {}", e);
                format!("Failed to create parent directory: {}", e)
            })?;
    }
    
    // 复用基础下载函数
    download_file_impl(url, full_path.to_string_lossy().to_string(), proxy).await
}

/// Tauri命令：获取远程哈希文件
#[tauri::command]
pub async fn fetch_remote_hashes(url: String, proxy: Option<String>) -> Result<Vec<FileChecksum>, String> {
    tracing::info!("开始获取远程哈希文件: {}", url);
    let start_time = std::time::Instant::now();
    
    let client = create_http_client(proxy)?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("获取远程哈希失败: {}", e);
            format!("Failed to fetch remote hashes: {}", e)
        })?;
    
    if !response.status().is_success() {
        tracing::error!("获取远程哈希失败，HTTP 状态码: {}", response.status());
        return Err(format!("Failed to fetch remote hashes with status: {}", response.status()));
    }
    
    let hashes: Vec<FileChecksum> = response.json()
        .await
        .map_err(|e| {
            tracing::error!("解析哈希 JSON 失败: {}", e);
            format!("Failed to parse remote hashes JSON: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("获取远程哈希成功，共 {} 个文件，耗时: {:.2}秒", hashes.len(), elapsed.as_secs_f64());
    
    Ok(hashes)
}
