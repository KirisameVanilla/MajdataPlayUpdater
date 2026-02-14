import { useState, useEffect } from 'react';
import { Container, Title, Text, Tabs, Alert, Button } from '@mantine/core';
import { IconAlertCircle, IconFolder, IconCloud, IconDownload } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { usePathContext } from '../contexts';
import { LocalCharts, OnlineCharts } from '../components';
import { useNavigate } from 'react-router-dom';

export function ChartPage() {
  const { defaultGameFolderPath } = usePathContext();
  const [hasGameExe, setHasGameExe] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('local');
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkGameExe();
  }, [defaultGameFolderPath]);

  useEffect(() => {
    if (activeTab === 'local') {
      setLocalRefreshTrigger(prev => prev + 1);
    }
  }, [activeTab]);

  const checkGameExe = async () => {
    if (!defaultGameFolderPath) {
      setIsChecking(false);
      return;
    }

    try {
      const gameFilePath = await join(defaultGameFolderPath, 'MajdataPlay.exe');
      const fileExists = await invoke<boolean>('file_exists', { path: gameFilePath });
      setHasGameExe(fileExists);
    } catch (error) {
      console.error('检查游戏文件出错:', error);
      setHasGameExe(false);
    } finally {
      setIsChecking(false);
    }
  };

  const goToGamePage = () => {
    navigate('/game');
  };

  if (isChecking) {
    return (
      <Container size="xl" py="xl">
        <Text>检查游戏文件...</Text>
      </Container>
    );
  }

  if (!hasGameExe) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="未检测到游戏"
          color="yellow"
        >
          <Text mb="md">
            请先前往游戏管理页面下载游戏，才能管理谱面。
          </Text>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={goToGamePage}
          >
            前往游戏页面
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} className="mb-4">
        谱面管理
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="local" leftSection={<IconFolder size={16} />}>
            本地谱面
          </Tabs.Tab>
          <Tabs.Tab value="online" leftSection={<IconCloud size={16} />}>
            云端谱面
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="local" pt="md">
          <LocalCharts onRefresh={checkGameExe} refreshTrigger={localRefreshTrigger} />
        </Tabs.Panel>

        <Tabs.Panel value="online" pt="md">
          <OnlineCharts onRefresh={checkGameExe} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
