import { useState, useEffect } from 'react';
import { Container, Card, Group, Text, Button, Stack, LoadingOverlay, Grid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconRefresh } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { usePathContext } from '../contexts';

interface SkinInfo {
  name: string;
}

interface LocalSkinsProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

export function LocalSkins({ onRefresh, refreshTrigger }: LocalSkinsProps) {
  const { defaultGameFolderPath } = usePathContext();
  const [skins, setSkins] = useState<SkinInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkins();
  }, [defaultGameFolderPath]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadSkins();
    }
  }, [refreshTrigger]);

  const loadSkins = async () => {
    if (!defaultGameFolderPath) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const skinsPath = `${defaultGameFolderPath}\\Skins`;
      
      const skinList = await invoke<SkinInfo[]>('list_skins', { skinsDir: skinsPath });
      setSkins(skinList);
    } catch (error) {
      console.error('加载皮肤失败:', error);
      notifications.show({
        title: '错误',
        message: '加载皮肤失败: ' + String(error),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkin = async (skin: SkinInfo) => {
    if (!defaultGameFolderPath) return;

    const confirmed = await ask(`确定要删除皮肤 "${skin.name}" 吗？此操作不可恢复！`, {
      title: '确认删除',
      kind: 'warning',
    });
    if (!confirmed) return;

    try {
      const skinsPath = `${defaultGameFolderPath}\\Skins`;
      await invoke('delete_skin', {
        skinsDir: skinsPath,
        skinName: skin.name,
      });

      notifications.show({
        title: '成功',
        message: '皮肤已删除',
        color: 'green',
      });

      setSkins(prev => prev.filter(s => s.name !== skin.name));
      onRefresh?.();
    } catch (error) {
      console.error('删除皮肤失败:', error);
      notifications.show({
        title: '错误',
        message: '删除皮肤失败: ' + String(error),
        color: 'red',
      });
    }
  };


  if (loading) {
    return (
      <Container size="xl" py="xl" style={{ position: 'relative', minHeight: 400 }}>
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (skins.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Text c="dimmed">暂无皮肤，请先下载皮肤或确保 Skins 目录存在</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={600}>本地皮肤 ({skins.length})</Text>
          <Button onClick={loadSkins} variant="light" leftSection={<IconRefresh size={16} />}>
            刷新
          </Button>
        </Group>

        <Grid gutter="sm">
          {skins.map(skin => (
            <Grid.Col key={skin.name} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text fw={500} size="sm" lineClamp={1}>
                    {skin.name}
                  </Text>
                  <Button
                    fullWidth
                    color="red"
                    variant="light"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => handleDeleteSkin(skin)}
                  >
                    删除
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
