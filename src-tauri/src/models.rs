/// 文件校验和数据结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct FileChecksum {
    pub name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub checksum: String,
}
