import { useState, useEffect } from 'react';
import { Container, Title, Text, Card, TextInput, Button, Group, Stack, ActionIcon } from '@mantine/core';
import { IconFolder, IconDeviceFloppy, IconFolderOpen, IconNetwork } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { open } from '@tauri-apps/plugin-dialog';
import { usePathContext } from '../contexts';

export function SettingPage() {
  const { appExeFolderPath, defaultGameFolderPath } = usePathContext();
  if (!appExeFolderPath || !defaultGameFolderPath) {
    return (
      <Container size="xl" py="xl">
        <Text c="red">无法获取应用程序路径，设置页面无法使用。</Text>
      </Container>
    );
  }
  const [gamePath, setGamePath] = useState<string>(defaultGameFolderPath);
  const [httpProxy, setHttpProxy] = useState<string>('');

  useEffect(() => {
    const savedPath = localStorage.getItem('gamePath');
    if (savedPath) {
      setGamePath(savedPath);
    }
    const savedProxy = localStorage.getItem('httpProxy');
    if (savedProxy) {
      setHttpProxy(savedProxy);
    }
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择游戏目录',
      });
      
      if (selected && typeof selected === 'string') {
        setGamePath(selected);
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '无法打开文件选择器',
        color: 'red',
      });
    }
  };

  const handleSave = () => {
    localStorage.setItem('gamePath', gamePath);
    localStorage.setItem('httpProxy', httpProxy);
    notifications.show({
      title: '保存成功',
      message: '设置已保存',
      color: 'green',
    });
  };

  return (
    <Container size="xl" py="xl">
      <div className="mb-8">
        <Title order={1}>
          设置
        </Title>
        <Text c="dimmed" size="lg">
          配置本工具的各项参数
        </Text>
      </div>

      <Card shadow="sm" mt='sm' padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            leftSection={<IconFolder size={18} />}
            rightSection={
              <ActionIcon 
                variant="subtle" 
                color="blue" 
                onClick={handleSelectFolder}
                title="选择文件夹"
              >
                <IconFolderOpen size={18} />
              </ActionIcon>
            }
            placeholder="./game"
            value={gamePath}
            onChange={(event) => setGamePath(event.currentTarget.value)}
            size="md"
            label="游戏目录路径"
            description="点击右侧图标选择游戏资源所在的文件夹路径"
          />

          <TextInput
            leftSection={<IconNetwork size={18} />}
            placeholder="例如：http://127.0.0.1:7890"
            value={httpProxy}
            onChange={(event) => setHttpProxy(event.currentTarget.value)}
            size="md"
            label="HTTP 代理"
            description="留空表示不使用代理，支持 http:// 和 https:// 格式"
          />

          <Group justify="flex-end">
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSave}
              color="blue"
            >
              保存设置
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
