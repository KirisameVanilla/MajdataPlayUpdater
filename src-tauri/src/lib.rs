use std::env;
use std::path::Path;
use sha2::{Sha256, Digest};
use tokio::fs;
use tokio::io::AsyncReadExt;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct FileChecksum {
    name: String,
    #[serde(rename = "filePath")]
    file_path: String,
    checksum: String,
}

// 计算单个文件的SHA256校验和
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

// 遍历文件夹并计算所有文件的校验和
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

#[tauri::command]
async fn calculate_checksums(directory: String, exclude_files: Vec<String>) -> Result<Vec<FileChecksum>, String> {
    let dir_path = Path::new(&directory);
    
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", directory));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory));
    }
    
    calculate_checksums_recursive(dir_path, dir_path, &exclude_files).await
}

#[tauri::command]
async fn save_checksums_to_file(
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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_app_exe_path() -> Result<String, String> {
    env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))
        .and_then(|path| {
            path.to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Invalid path encoding".to_string())
        })
}

#[tauri::command]
fn get_app_exe_folder_path() -> Result<String, String> {
    env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))
        .and_then(|path| {
            path.parent()
                .and_then(|p| p.to_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "Invalid path encoding".to_string())
        })
}

#[tauri::command]
fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

// 创建 HTTP 客户端，支持代理和重定向
fn create_http_client(proxy: Option<String>) -> Result<reqwest::Client, String> {
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

// 下载文件（内部使用）
async fn download_file_impl(url: String, output_path: String, proxy: Option<String>) -> Result<String, String> {
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

#[tauri::command]
fn extract_zip(zip_path: String, target_dir: String) -> Result<String, String> {
    let file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;
    
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;
    
    // 获取 zip 文件的根目录名称（通常是 MajdataPlay_Build-master）
    let root_folder = if archive.len() > 0 {
        let first_file = archive.by_index(0)
            .map_err(|e| format!("Failed to read first entry: {}", e))?;
        let path = first_file.name();
        path.split('/').next().unwrap_or("").to_string()
    } else {
        String::new()
    };
    
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
    
    Ok(format!("Extracted {} files to {}", archive.len(), target_dir))
}

#[tauri::command]
async fn download_and_extract(url: String, target_path: String, zip_path: String, proxy: Option<String>) -> Result<String, String> {
    fs::create_dir_all(&target_path)
        .await
        .map_err(|e| format!("Failed to create target directory: {}", e))?;
    
    download_file_impl(url, zip_path.clone(), proxy).await?;
    
    let extract_result = extract_zip(zip_path.clone(), target_path)?;
    
    fs::remove_file(&zip_path)
        .await
        .map_err(|e| format!("Failed to remove zip file: {}", e))?;
    
    Ok(extract_result)
}

// 下载单个文件到指定位置
#[tauri::command]
async fn download_file_to_path(url: String, file_path: String, target_dir: String, proxy: Option<String>) -> Result<String, String> {
    let full_path = Path::new(&target_dir).join(&file_path);
    
    // 确保父目录存在
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }
    
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
    
    fs::write(&full_path, &bytes)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(format!("Downloaded to {}", full_path.to_string_lossy()))
}

// 获取远程哈希文件
#[tauri::command]
async fn fetch_remote_hashes(url: String, proxy: Option<String>) -> Result<Vec<FileChecksum>, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_exe_path, 
            get_app_exe_folder_path,
            file_exists,
            calculate_checksums,
            save_checksums_to_file,
            extract_zip,
            download_and_extract,
            download_file_to_path,
            fetch_remote_hashes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
