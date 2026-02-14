use std::path::Path;
use tokio::fs;
use crate::models::FileChecksum;
use serde::{Deserialize, Serialize};

/// 谱面摘要信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSummary {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub designer: String,
    pub uploader: String,
    pub levels: Vec<Option<String>>,  // API 返回数组，可能包含 null、空字符串或 "13+", "14" 等
}

/// 创建 HTTP 客户端，支持代理和重定向
pub fn create_http_client(proxy: Option<String>) -> Result<reqwest::Client, String> {
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
    tracing::info!("下载文件: {} -> {}", url, output_path);
    let start_time = std::time::Instant::now();
    
    let client = create_http_client(proxy)?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("❌ 下载文件失败!");
            tracing::error!("  错误类型: {}", e);
            tracing::error!("  是否超时: {}", e.is_timeout());
            tracing::error!("  是否连接错误: {}", e.is_connect());
            format!("Failed to download file: {}", e)
        })?;
    
    let status = response.status();
    
    if !status.is_success() {
        tracing::error!("❌ 下载失败，HTTP 状态码: {}", status);
        return Err(format!("Download failed with status: {}", status));
    }
    
    let bytes = response.bytes()
        .await
        .map_err(|e| {
            tracing::error!("❌ 读取响应失败: {}", e);
            format!("Failed to read response: {}", e)
        })?;
    
    let file_size = bytes.len();
    
    fs::write(&output_path, &bytes)
        .await
        .map_err(|e| {
            tracing::error!("❌ 写入文件失败: {}", e);
            format!("Failed to write file: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("下载成功: {} ({:.2} KB, {:.2}s)", output_path, file_size as f64 / 1024.0, elapsed.as_secs_f64());
    
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
    tracing::info!("获取远程哈希: {}", url);
    let start_time = std::time::Instant::now();
    
    let client = create_http_client(proxy.clone())?;
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("❌ 获取远程哈希失败!");
            tracing::error!("  错误类型: {}", e);
            tracing::error!("  是否超时: {}", e.is_timeout());
            tracing::error!("  是否连接错误: {}", e.is_connect());
            format!("Failed to fetch remote hashes: {}", e)
        })?;
    
    let status = response.status();
    
    if !status.is_success() {
        tracing::error!("获取远程哈希失败，HTTP 状态码: {}", status);
        return Err(format!("Failed to fetch remote hashes with status: {}", status));
    }
    
    let hashes: Vec<FileChecksum> = response.json()
        .await
        .map_err(|e| {
            tracing::error!("❌ 解析哈希 JSON 失败: {}", e);
            format!("Failed to parse remote hashes JSON: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("获取远程哈希成功: {} 个文件, {:.2}s", hashes.len(), elapsed.as_secs_f64());
    
    Ok(hashes)
}

/// Tauri命令：搜索谱面列表
#[tauri::command]
pub async fn fetch_chart_list(
    search: String,
    sort_type: i32,
    page: i32,
    proxy: Option<String>
) -> Result<Vec<ChartSummary>, String> {
    tracing::info!("搜索谱面: '{}', sort={}, page={}", search, sort_type, page);
    let start_time = std::time::Instant::now();
    
    let client = create_http_client(proxy.clone())?;
    
    // 构建 API URL
    let sort_words = ["", "likep", "commp", "playp"];
    let sort_param = if sort_type >= 0 && sort_type < sort_words.len() as i32 {
        sort_words[sort_type as usize]
    } else {
        ""
    };
    
    let url = format!(
        "https://majdata.net/api3/api/maichart/list?sort={}&page={}&search={}",
        sort_param,
        page,
        urlencoding::encode(&search)
    );
    
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("❌ 网络请求失败!");
            tracing::error!("  错误类型: {}", e);
            tracing::error!("  是否超时: {}", e.is_timeout());
            tracing::error!("  是否连接错误: {}", e.is_connect());
            format!("Failed to fetch chart list: {}", e)
        })?;
    
    let status = response.status();
    
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_else(|_| "无法读取错误响应体".to_string());
        tracing::error!("❌ HTTP 请求失败!");
        tracing::error!("  状态码: {}", status);
        tracing::error!("  响应体: {}", error_body);
        return Err(format!("Failed to fetch chart list with status: {} - {}", status, error_body));
    }
    
    // 读取响应体文本
    let response_text = response.text()
        .await
        .map_err(|e| {
            tracing::error!("❌ 读取响应体失败: {}", e);
            format!("Failed to read response body: {}", e)
        })?;
    
    // 解析 JSON
    let charts: Vec<ChartSummary> = serde_json::from_str(&response_text)
        .map_err(|e| {
            tracing::error!("❌ 解析 JSON 失败!");
            tracing::error!("  错误: {}", e);
            tracing::error!("  响应体（前 1000 字符）: {}", 
                if response_text.len() > 1000 { 
                    &response_text[..1000] 
                } else { 
                    &response_text 
                }
            );
            format!("Failed to parse chart list JSON: {}", e)
        })?;
    
    let elapsed = start_time.elapsed();
    tracing::info!("获取谱面列表成功: {} 个谱面, {:.2}s", charts.len(), elapsed.as_secs_f64());
    
    Ok(charts)
}
