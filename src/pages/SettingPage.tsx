import { useState, useEffect } from 'react';
import { Container, Title, Text, Card, TextInput, Button, Group, Stack, ActionIcon } from '@mantine/core';
import { IconFolder, IconDeviceFloppy, IconFolderOpen } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { open } from '@tauri-apps/plugin-dialog';

export function SettingPage() {
  const [gamePath, setGamePath] = useState<string>('./game');

  useEffect(() => {
    const savedPath = localStorage.getItem('gamePath');
    if (savedPath) {
      setGamePath(savedPath);
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
    notifications.show({
      title: '保存成功',
      message: '游戏目录设置已保存',
      color: 'green',
    });
  };

  return (
    <Container size="xl" py="xl">
      <div className="mb-8">
        <Title order={1} className="mb-2">
          设置
        </Title>
        <Text c="dimmed" size="lg">
          配置本工具的各项参数
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
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
