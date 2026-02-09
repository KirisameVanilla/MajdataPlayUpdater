import { Container, Title, Text, Card, Grid, Group, Badge, ThemeIcon } from '@mantine/core';
import { IconMusic, IconFiles, IconSettings, IconTrendingUp } from '@tabler/icons-react';

const statsData = [
  {
    title: '谱面数量',
    value: '0',
    icon: IconMusic,
    color: 'blue',
    description: '总计谱面数',
  },
  {
    title: '项目文件',
    value: '0',
    icon: IconFiles,
    color: 'green',
    description: '已管理文件',
  },
  {
    title: '最近更新',
    value: '--',
    icon: IconTrendingUp,
    color: 'orange',
    description: '上次修改时间',
  },
  {
    title: '配置',
    value: '就绪',
    icon: IconSettings,
    color: 'violet',
    description: '系统状态',
  },
];

export function HomePage() {
  return (
    <Container size="xl" py="xl" className="h-full">
      <div className="mb-8">
        <Title order={1} className="mb-2">
          欢迎来到 Majdata Hub
        </Title>
        <Text c="dimmed" size="lg">
          Majdata 小工具
        </Text>
      </div>

      <Grid gutter="md">
        {statsData.map((stat) => (
          <Grid.Col key={stat.title} span={{ base: 12, sm: 6, lg: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder className="h-full">
              <Group justify="space-between" mb="xs">
                <ThemeIcon size="xl" radius="md" variant="light" color={stat.color}>
                  <stat.icon size={24} stroke={1.5} />
                </ThemeIcon>
                <Badge color={stat.color} variant="light">
                  {stat.title}
                </Badge>
              </Group>

              <Text size="xl" fw={700} className="mb-2">
                {stat.value}
              </Text>

              <Text size="sm" c="dimmed">
                {stat.description}
              </Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="mt-6">
        <Title order={3} className="mb-4">
          快速开始
        </Title>
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
            <Text fw={600} className="mb-2">
              导入谱面
            </Text>
            <Text size="sm" c="dimmed">
              点击 Chart 页面开始导入和管理你的谱面文件
            </Text>
          </div>
          <div className="bg-purple-50 p-4 border border-purple-200 rounded-lg">
            <Text fw={600} className="mb-2">
              自定义皮肤
            </Text>
            <Text size="sm" c="dimmed">
              在 Skin 页面中管理和预览你的自定义皮肤资源
            </Text>
          </div>
          <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
            <Text fw={600} className="mb-2">
              配置设置
            </Text>
            <Text size="sm" c="dimmed">
              根据你的需求调整工具的各项配置和偏好设置
            </Text>
          </div>
        </div>
      </Card>
    </Container>
  );
}
