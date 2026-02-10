import { Container, Title, Text, Card, Stack, Loader, Code, CopyButton, Tooltip, ActionIcon, Group } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { usePathContext } from '../contexts';

export function DebugPage() {
  const { appExePath, appDataPath, appLocalDataPath, appCachePath, resourcePath, isLoading, error } = usePathContext();

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
