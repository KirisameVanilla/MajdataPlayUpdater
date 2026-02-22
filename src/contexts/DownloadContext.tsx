import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileChecksum } from '../utils/hash';

interface DownloadContextType {
  isDownloading: boolean;
  downloadProgress: number;
  setIsDownloading: (value: boolean) => void;
  setDownloadProgress: (value: number) => void;
  isUpdating: boolean;
  updateList: FileChecksum[];
  setIsUpdating: (value: boolean) => void;
  setUpdateList: (value: FileChecksum[]) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownloadContext = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownloadContext必须在DownloadProvider内部使用');
  }
  return context;
};

interface DownloadProviderProps {
  children: ReactNode;
}

export const DownloadProvider: React.FC<DownloadProviderProps> = ({ children }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateList, setUpdateList] = useState<FileChecksum[]>([]);

  return (
    <DownloadContext.Provider value={{
      isDownloading, downloadProgress, setIsDownloading, setDownloadProgress,
      isUpdating, updateList, setIsUpdating, setUpdateList,
    }}>
      {children}
    </DownloadContext.Provider>
  );
};
