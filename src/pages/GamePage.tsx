import { useState, useEffect } from 'react';
import { Container, Title, Text, Button, Card, Progress, Alert, List, LoadingOverlay, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconRefresh, IconCheck, IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { usePathContext } from '../contexts';
import { calculateChecksums, FileChecksum } from '../utils/hash';
import { normalizePath } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';

const REMOTE_ZIP_URL = 'https://github.com/TeamMajdata/MajdataPlay_Build/archive/refs/heads/master.zip';
const REMOTE_HASH_URL = 'https://github.com/TeamMajdata/MajdataPlay_Build/raw/refs/heads/master/smallest_hashes.json';
const GITHUB_RAW_BASE = 'https://github.com/TeamMajdata/MajdataPlay_Build/raw/refs/heads/master/';

interface LaunchOption {
  id: string;
  label: string;
  description: string;
}

export function GamePage() {
  const { defaultGameFolderPath } = usePathContext();
  const [hasGameExe, setHasGameExe] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateList, setUpdateList] = useState<FileChecksum[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    const checkLocalHash = async () => {
      if (!defaultGameFolderPath) {
        setIsChecking(false);
        return;
      }

      try {
        const gameFilePath = await join(defaultGameFolderPath, 'MajdataPlay.exe');
        
        const fileExists = await invoke<boolean>('file_exists', { path: gameFilePath });
        setHasGameExe(fileExists);
      } catch (error) {
        console.error('检查本地哈希文件出错:', error);
        notifications.show({
          title: '错误',
          message: '检查本地文件时出错',
          color: 'red',
          icon: <IconAlertCircle />,
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkLocalHash();
  }, [defaultGameFolderPath]);

  // 加载启动选项列表
  useEffect(() => {
    const loadLaunchOptions = async () => {
      try {
        const options = await invoke<LaunchOption[]>('get_launch_options');
        setLaunchOptions(options);
        if (options.length > 0) {
          setSelectedOption(options[0].id);
        }
      } catch (error) {
        console.error('获取启动选项失败:', error);
      }
    };

    loadLaunchOptions();
  }, []);

  const checkForUpdates = async () => {
    if (!defaultGameFolderPath) return;

    try {
      setIsChecking(true);
      
      const localHashes = await calculateChecksums(defaultGameFolderPath);
      
      const httpProxy = localStorage.getItem('httpProxy') || null;
      
      const remoteHashes: FileChecksum[] = await invoke('fetch_remote_hashes', {
        url: REMOTE_HASH_URL,
        proxy: httpProxy,
      });

      const filesToUpdate: FileChecksum[] = [];

      for (const remoteFile of remoteHashes) {
        const normalizedRemotePath = normalizePath(remoteFile.filePath);
        
        // 查找对应的本地文件
        const localFile = localHashes.find(local => 
          normalizePath(local.filePath) === normalizedRemotePath
        );

        // 如果本地没有这个文件，或者 checksum 不一致，则需要更新
        if (!localFile || localFile.checksum !== remoteFile.checksum) {
          filesToUpdate.push(remoteFile);
        }
      }

      setUpdateList(filesToUpdate);

      if (filesToUpdate.length > 0) {
        notifications.show({
          title: '发现更新',
          message: `有 ${filesToUpdate.length} 个文件需要更新`,
          color: 'blue',
          icon: <IconRefresh />,
        });
      } else {
        notifications.show({
          title: '已是最新版本',
          message: '无需更新',
          color: 'green',
          icon: <IconCheck />,
        });
      }
    } catch (error) {
      console.error('检查更新出错:', error);
      notifications.show({
        title: '错误',
        message: '检查更新时出错: ' + (error as Error).message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // 下载完整游戏
  const handleDownload = async () => {
    if (!defaultGameFolderPath) {
      notifications.show({
        title: '错误',
        message: '游戏文件夹路径未设置',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(10);

      notifications.show({
        id: 'downloading',
        title: '开始下载',
        message: '正在下载游戏文件...',
        color: 'blue',
        icon: <IconDownload />,
        autoClose: false,
        loading: true,
      });

      // 下载 zip 文件路径
      const zipPath = await join(defaultGameFolderPath, '..', 'majdata_master.zip');
      
      setDownloadProgress(30);
      
      // 从 localStorage 获取代理设置
      const httpProxy = localStorage.getItem('httpProxy') || null;
      
      // 使用 Rust 命令下载并解压
      await invoke('download_and_extract', {
        url: REMOTE_ZIP_URL,
        targetPath: defaultGameFolderPath,
        zipPath: zipPath,
        proxy: httpProxy,
      });

      setDownloadProgress(100);

      notifications.update({
        id: 'downloading',
        title: '下载完成',
        message: '游戏文件已成功下载并解压',
        color: 'green',
        icon: <IconCheck />,
        autoClose: 3000,
        loading: false,
      });

      // 重新检查游戏文件
      setHasGameExe(true);
    } catch (error) {
      console.error('下载出错:', error);
      notifications.update({
        id: 'downloading',
        title: '下载失败',
        message: '下载游戏文件时出错: ' + (error as Error).message,
        color: 'red',
        icon: <IconAlertCircle />,
        autoClose: 5000,
        loading: false,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 执行更新
  const handleUpdate = async () => {
    if (!defaultGameFolderPath || updateList.length === 0) return;

    try {
      setIsUpdating(true);
      
      notifications.show({
        id: 'updating',
        title: '开始更新',
        message: `正在更新 ${updateList.length} 个文件...`,
        color: 'blue',
        icon: <IconRefresh />,
        autoClose: false,
        loading: true,
      });

      // 从 localStorage 获取代理设置
      const httpProxy = localStorage.getItem('httpProxy') || null;

      // 批量下载文件（使用 Promise.all 实现并发下载）
      const downloadTasks = updateList.map(async (file) => {
        const fileUrl = GITHUB_RAW_BASE + file.filePath;
        try {
          await invoke('download_file_to_path', {
            url: fileUrl,
            filePath: file.filePath,
            targetDir: defaultGameFolderPath,
            proxy: httpProxy,
          });
          return { success: true, file: file.filePath };
        } catch (error) {
          console.error(`下载 ${file.filePath} 失败:`, error);
          return { success: false, file: file.filePath, error };
        }
      });

      // 并发下载，最多同时下载 5 个文件
      const batchSize = 5;
      const results = [];
      for (let i = 0; i < downloadTasks.length; i += batchSize) {
        const batch = downloadTasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
        
        // 更新进度通知
        notifications.update({
          id: 'updating',
          message: `正在更新... (${results.length}/${downloadTasks.length})`,
        });
      }

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        notifications.update({
          id: 'updating',
          title: '部分更新失败',
          message: `${failed.length} 个文件更新失败`,
          color: 'orange',
          icon: <IconAlertCircle />,
          autoClose: 5000,
          loading: false,
        });
      } else {
        notifications.update({
          id: 'updating',
          title: '更新完成',
          message: '所有文件已成功更新',
          color: 'green',
          icon: <IconCheck />,
          autoClose: 3000,
          loading: false,
        });
      }

      // 重新检查更新
      await checkForUpdates();
    } catch (error) {
      console.error('更新出错:', error);
      notifications.update({
        id: 'updating',
        title: '更新失败',
        message: '更新文件时出错: ' + (error as Error).message,
        color: 'red',
        icon: <IconAlertCircle />,
        autoClose: 5000,
        loading: false,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // 启动游戏
  const handleLaunchGame = async () => {
    if (!defaultGameFolderPath || !selectedOption) {
      notifications.show({
        title: '错误',
        message: '请选择启动项',
        color: 'red',
        icon: <IconAlertCircle />,
      });
      return;
    }

    try {
      setIsLaunching(true);
      
      await invoke('launch_game', {
        gameDir: defaultGameFolderPath,
        optionId: selectedOption,
      });

      const option = launchOptions.find(opt => opt.id === selectedOption);
      notifications.show({
        title: '启动成功',
        message: `已启动: ${option?.label || selectedOption}`,
        color: 'green',
        icon: <IconPlayerPlay />,
      });
    } catch (error) {
      console.error('启动游戏失败:', error);
      notifications.show({
        title: '启动失败',
        message: '启动游戏时出错: ' + (error as Error).message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Container size="xl" py="xl" className="h-full">
      <div className="mb-8">
        <Title order={1} className="mb-2">
          游戏管理
        </Title>
        <Text c="dimmed" size="lg">
          下载和更新 MajdataPlay 游戏文件
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="relative">
        <LoadingOverlay visible={isChecking || isUpdating} />

        {defaultGameFolderPath && (
          <Alert mb="lg" color="blue" variant="light">
            <Text size="sm">游戏文件夹: {defaultGameFolderPath}</Text>
          </Alert>
        )}

        {!hasGameExe && (
          <div className="py-8 text-center">
            <Button
              size="lg"
              leftSection={<IconDownload size={20} />}
              onClick={handleDownload}
              loading={isDownloading}
              disabled={!defaultGameFolderPath}
            >
              下载游戏
            </Button>
            {isDownloading && (
              <Progress value={downloadProgress} mt="md" />
            )}
          </div>
        )}

        {hasGameExe && (
          <div>
            {updateList.length > 0 && (
              <>
                <Alert mb="lg" color="orange" variant="light" icon={<IconRefresh />}>
                  <Text fw={500}>发现 {updateList.length} 个文件需要更新</Text>
                </Alert>

                <Card mb="lg" withBorder>
                  <Text fw={500} mb="sm">待更新文件列表:</Text>
                  <List size="sm" spacing="xs" className="max-h-64 overflow-y-auto">
                    {updateList.slice(0, 20).map((file, index) => (
                      <List.Item key={index}>
                        <Text size="sm" c="dimmed">{file.filePath}</Text>
                      </List.Item>
                    ))}
                    {updateList.length > 20 && (
                      <List.Item>
                        <Text size="sm" c="dimmed">...还有 {updateList.length - 20} 个文件</Text>
                      </List.Item>
                    )}
                  </List>
                </Card>
              </>
            )}

            <div className="flex gap-4">
              <Button
                size="lg"
                variant="light"
                leftSection={<IconRefresh size={20} />}
                onClick={checkForUpdates}
                loading={isChecking}
                className="flex-1"
              >
                检测更新
              </Button>

              <Button
                size="lg"
                leftSection={<IconRefresh size={20} />}
                onClick={handleUpdate}
                loading={isUpdating}
                disabled={updateList.length === 0}
                className="flex-1"
              >
                更新游戏
              </Button>
            </div>
          </div>
        )}
      </Card>

      {hasGameExe && (
        <Card shadow="sm" padding="lg" radius="md" withBorder className="relative mt-6">
          <LoadingOverlay visible={isUpdating} />
          <Title order={3} className="mb-4">
            启动游戏
          </Title>
          
          <Select
            label="选择启动方式"
            placeholder="选择一个启动项"
            description="选择不同的图形 API 或游戏模式"
            data={launchOptions.map(opt => ({
              value: opt.id,
              label: opt.label,
            }))}
            value={selectedOption}
            onChange={setSelectedOption}
            mb="md"
          />

          {selectedOption && (
            <Text size="sm" c="dimmed" mb="md">
              {launchOptions.find(opt => opt.id === selectedOption)?.description}
            </Text>
          )}

          <Button
            size="lg"
            leftSection={<IconPlayerPlay size={20} />}
            onClick={handleLaunchGame}
            loading={isLaunching}
            disabled={!selectedOption || launchOptions.length === 0}
            fullWidth
          >
            启动游戏
          </Button>
        </Card>
      )}
    </Container>
  );
}
