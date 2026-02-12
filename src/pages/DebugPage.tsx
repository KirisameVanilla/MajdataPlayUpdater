import { Container, Title, Text, Card, Stack, Loader, Code, CopyButton, Tooltip, ActionIcon, Group, Button, TextInput } from '@mantine/core';
import { IconCopy, IconCheck, IconHash, IconDeviceFloppy } from '@tabler/icons-react';
import { usePathContext } from '../contexts';
import { calculateChecksums, saveChecksumsToFile } from '../utils/hash';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

export function DebugPage() {
  const { appExePath, appDataPath, appLocalDataPath, appCachePath, resourcePath, isLoading, error } = usePathContext();
  const [directory, setDirectory] = useState('');
  const [outputFile, setOutputFile] = useState('hashes.json');
  const [hashLoading, setHashLoading] = useState(false);
  const [hashResult, setHashResult] = useState<any>(null);

  const handleCalculateChecksums = async () => {
    if (!directory) {
      notifications.show({
        title: '错误',
        message: '请输入目录路径',
        color: 'red',
      });
      return;
    }

    setHashLoading(true);
    setHashResult(null);
    try {
      const result = await calculateChecksums(directory);
      setHashResult(result);
      notifications.show({
        title: '成功',
        message: `成功计算 ${result.length} 个文件的校验和`,
        color: 'green',
      });
    } catch (err: any) {
      notifications.show({
        title: '计算失败',
        message: err.toString(),
        color: 'red',
      });
    } finally {
      setHashLoading(false);
    }
  };

  const handleSaveChecksums = async () => {
    if (!directory) {
      notifications.show({
        title: '错误',
        message: '请输入目录路径',
        color: 'red',
      });
      return;
    }

    if (!outputFile) {
      notifications.show({
        title: '错误',
        message: '请输入输出文件名',
        color: 'red',
      });
      return;
    }

    setHashLoading(true);
    try {
      const result = await saveChecksumsToFile(directory, outputFile);
      notifications.show({
        title: '成功',
        message: result,
        color: 'green',
      });
    } catch (err: any) {
      notifications.show({
        title: '保存失败',
        message: err.toString(),
        color: 'red',
      });
    } finally {
      setHashLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <div className="mb-8">
        <Title order={1} className="mb-2">
          调试信息
        </Title>
        <Text c="dimmed" size="lg">
          查看系统路径和调试信息
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">
          系统路径信息
        </Title>
        
        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="md" />
            <Text>正在加载路径信息...</Text>
          </Group>
        ) : error ? (
          <Text c="red">加载路径失败: {error}</Text>
        ) : (
          <Stack gap="md">
            <PathItem label="应用程序EXE路径" path={appExePath} />
            <PathItem label="应用数据目录" path={appDataPath} />
            <PathItem label="本地数据目录" path={appLocalDataPath} />
            <PathItem label="缓存目录" path={appCachePath} />
            <PathItem label="资源目录" path={resourcePath} />
          </Stack>
        )}
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
        <Title order={3} mb="md">
          Hash 校验和测试
        </Title>
        
        <Stack gap="md">
          <TextInput
            label="目录路径"
            placeholder="输入要计算hash的目录路径，例如：C:/path/to/directory"
            value={directory}
            onChange={(e) => setDirectory(e.currentTarget.value)}
          />
          
          <TextInput
            label="输出文件名"
            placeholder="输出JSON文件名"
            value={outputFile}
            onChange={(e) => setOutputFile(e.currentTarget.value)}
          />

          <Group>
            <Button 
              leftSection={<IconHash size={18} />}
              onClick={handleCalculateChecksums}
              loading={hashLoading}
            >
              计算校验和
            </Button>
            
            <Button 
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSaveChecksums}
              loading={hashLoading}
              variant="light"
            >
              保存到文件
            </Button>
          </Group>

          {hashResult && (
            <div>
              <Text size="sm" fw={500} mb={4}>
                计算结果 ({hashResult.length} 个文件)
              </Text>
              <Code block mah={300} style={{ overflow: 'auto' }}>
                {JSON.stringify(hashResult, null, 2)}
              </Code>
            </div>
          )}
        </Stack>
      </Card>
    </Container>
  );
}

function PathItem({ label, path }: { label: string; path: string | null }) {
  return (
    <div>
      <Text size="sm" fw={500} mb={4}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Code style={{ flex: 1, wordBreak: 'break-all' }}>
          {path || '未获取到'}
        </Code>
        {path && (
          <CopyButton value={path} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? '已复制' : '复制路径'} withArrow position="right">
                <ActionIcon 
                  color={copied ? 'teal' : 'gray'} 
                  variant="subtle" 
                  onClick={copy}
                >
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        )}
      </Group>
    </div>
  );
}
