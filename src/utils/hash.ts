import { invoke } from '@tauri-apps/api/core';

const ROOT_EXCLUDE_FILES = [
  "smallest_hashes.json",
  "hashes.json",
  "hash.ts",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  ".gitignore",
  ".github",
  ".git",
  "node_modules",
  "MaiCharts",
  "Skins"
];

export interface FileChecksum {
  name: string;
  filePath: string;
  checksum: string;
}

// 计算文件夹中所有文件的校验和
export async function calculateChecksums(
  directory: string,
  excludeFiles: string[] = ROOT_EXCLUDE_FILES
): Promise<FileChecksum[]> {
  try {
    const result = await invoke<FileChecksum[]>('calculate_checksums', {
      directory,
      excludeFiles,
    });
    return result;
  } catch (error) {
    console.error('计算校验和时出错:', error);
    throw error;
  }
}

// 保存文件校验和信息到 JSON 文件
export async function saveChecksumsToFile(
  directory: string,
  outputFile: string,
  excludeFiles: string[] = ROOT_EXCLUDE_FILES
): Promise<string> {
  try {
    const result = await invoke<string>('save_checksums_to_file', {
      directory,
      outputFile,
      excludeFiles,
    });
    console.log(result);
    return result;
  } catch (error) {
    console.error('保存校验和时出错:', error);
    throw error;
  }
}