import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { appDataDir, appLocalDataDir, appCacheDir, resourceDir, join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';

interface PathContextType {
  appExePath: string | null;
  appExeFolderPath: string | null;
  appDataPath: string | null;
  appLocalDataPath: string | null;
  appCachePath: string | null;
  defaultGameFolderPath: string | null;
  resourcePath: string | null;
  isLoading: boolean;
  error: string | null;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

export const usePathContext = () => {
  const context = useContext(PathContext);
  if (!context) {
    throw new Error('usePathContext必须在PathProvider内部使用');
  }
  return context;
};

interface PathProviderProps {
  children: ReactNode;
}

export const PathProvider: React.FC<PathProviderProps> = ({ children }) => {
  const [appExePath, setAppExePath] = useState<string | null>(null);
  const [appExeFolderPath, setAppExeFolderPath] = useState<string | null>(null);
  const [appDataPath, setAppDataPath] = useState<string | null>(null);
  const [appLocalDataPath, setAppLocalDataPath] = useState<string | null>(null);
  const [appCachePath, setAppCachePath] = useState<string | null>(null);
  const [resourcePath, setResourcePath] = useState<string | null>(null);
  const [defaultGameFolderPath, setDefaultGameFolderPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaths = async () => {
      try {
        setIsLoading(true);
        
        // 获取各种路径
        const [
          appData,
          appLocalData,
          appCache,
          resource
        ] = await Promise.all([
          appDataDir(),
          appLocalDataDir(),
          appCacheDir(),
          resourceDir(),
        ]);

        setAppDataPath(appData);
        setAppLocalDataPath(appLocalData);
        setAppCachePath(appCache);
        setResourcePath(resource);

        // 尝试获取exe路径（需要在Rust端实现）
        try {
          const exePath = await invoke<string>('get_app_exe_path');
          const exeFolderPath = await invoke<string>('get_app_exe_folder_path');
          setAppExePath(exePath);
          setAppExeFolderPath(exeFolderPath);
          setDefaultGameFolderPath(await join(exeFolderPath, 'game'));
        } catch (err) {
          console.warn('无法获取exe路径:', err);
          // 如果未实现该命令，使用resource目录作为备选
          setAppExePath(resource);
          setAppExeFolderPath(resource);
          setDefaultGameFolderPath(await join(resource, 'game'));
        }

        setError(null);
      } catch (err) {
        console.error('加载路径失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    loadPaths();
  }, []);

  const value: PathContextType = {
    appExePath,
    appExeFolderPath,
    appDataPath,
    appLocalDataPath,
    appCachePath,
    resourcePath,
    defaultGameFolderPath,
    isLoading,
    error,
  };

  return <PathContext.Provider value={value}>{children}</PathContext.Provider>;
};
