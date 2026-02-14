import { useState, useEffect } from 'react';
import { Container, TextInput, Card, Group, Text, Button, Stack, Grid, LoadingOverlay, Modal, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconSearch, IconBrandGithub } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { usePathContext } from '../contexts';

interface GithubSkin {
  name: string;
  download_url: string;
  size: number;
}

interface OnlineSkinsProps {
  onRefresh?: () => void;
}

export function OnlineSkins({ onRefresh }: OnlineSkinsProps) {
  const { defaultGameFolderPath } = usePathContext();
  const [search, setSearch] = useState('');
  const [skins, setSkins] = useState<GithubSkin[]>([]);
  const [filteredSkins, setFilteredSkins] = useState<GithubSkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<GithubSkin | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSkins();
  }, []);

  const getProxy = (): string | null => {
    const savedProxy = localStorage.getItem('httpProxy');
    return savedProxy && savedProxy.trim() !== '' ? savedProxy : null;
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredSkins(skins);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredSkins(
        skins.filter(skin => skin.name.toLowerCase().includes(searchLower))
      );
    }
  }, [search, skins]);

  const loadSkins = async () => {
    setLoading(true);
    try {
      const skinList = await invoke<GithubSkin[]>('fetch_github_skins', {
        proxy: getProxy(),
      });
      
      // 过滤出 .zip 文件
      const zipSkins = skinList.filter(skin => skin.name.toLowerCase().endsWith('.zip'));
      setSkins(zipSkins);
      setFilteredSkins(zipSkins);
    } catch (error) {
      console.error('获取皮肤列表失败:', error);
      notifications.show({
        title: '错误',
        message: '获取皮肤列表失败: ' + String(error),
        color: 'red',
      });
      setSkins([]);
      setFilteredSkins([]);
    } finally {
      setLoading(false);
    }
  };

  const openDownloadModal = (skin: GithubSkin) => {
    setSelectedSkin(skin);
    setDownloadModalOpen(true);
  };

  const downloadSkin = async () => {
    if (!selectedSkin || !defaultGameFolderPath) return;

    setDownloading(true);
    try {
      const skinsPath = `${defaultGameFolderPath}\\Skins`;

      await invoke('download_skin_zip', {
        url: selectedSkin.download_url,
        skinName: selectedSkin.name,
        skinsDir: skinsPath,
        proxy: getProxy(),
      });

      notifications.show({
        title: '成功',
        message: `皮肤 "${selectedSkin.name}" 已下载并解压`,
        color: 'green',
      });

      setDownloadModalOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('下载皮肤失败:', error);
      notifications.show({
        title: '错误',
        message: '下载皮肤失败: ' + String(error),
        color: 'red',
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      <Container size="xl" py="md">
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder="搜索皮肤..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button onClick={loadSkins} loading={loading}>
              刷新
            </Button>
          </Group>

          {loading ? (
            <div style={{ position: 'relative', minHeight: 400 }}>
              <LoadingOverlay visible={true} />
            </div>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                <IconBrandGithub size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> 来自 GitHub: teamMajdata/MajdataPlay-Skins
              </Text>

              <Grid gutter="sm">
                {filteredSkins.map((skin) => (
                  <Grid.Col key={skin.name} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <Stack gap="xs">
                        <Text fw={500} size="sm" lineClamp={1}>
                          {skin.name.replace('.zip', '')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          大小: {formatFileSize(skin.size)}
                        </Text>
                        <Button
                          fullWidth
                          size="xs"
                          leftSection={<IconDownload size={14} />}
                          onClick={() => openDownloadModal(skin)}
                        >
                          下载
                        </Button>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {filteredSkins.length === 0 && !loading && (
                <Text c="dimmed" ta="center" py="xl">
                  {search ? '没有找到匹配的皮肤' : '暂无可用皮肤'}
                </Text>
              )}
            </>
          )}
        </Stack>
      </Container>

      <Modal
        opened={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title="下载皮肤"
      >
        <Stack gap="md">
          <Text size="sm">
            下载皮肤: <Text span fw={600}>{selectedSkin?.name.replace('.zip', '')}</Text>
          </Text>
          <Text size="xs" c="dimmed">
            文件大小: {selectedSkin ? formatFileSize(selectedSkin.size) : ''}
          </Text>
          <Text size="xs" c="blue">
            下载后将自动解压到 Skins 目录
          </Text>
          
          <Divider />
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDownloadModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={downloadSkin}
              loading={downloading}
            >
              下载
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
