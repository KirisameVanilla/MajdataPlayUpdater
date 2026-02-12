export type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  path: string;
};

export type PageProps = {
  title: string;
};

export interface HashObject {
  name: string;
  filePath: string;
  checksum: string;
}

// 标准化路径分隔符，将所有反斜杠转换为正斜杠
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

// 比较两个 HashObject 是否相等（基于标准化后的路径）
export function hashObjectEquals(a: HashObject, b: HashObject): boolean {
  return normalizePath(a.filePath) === normalizePath(b.filePath);
}
