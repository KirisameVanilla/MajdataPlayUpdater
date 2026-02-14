import { Container, Title, Text, Card, Group, Stack, Badge, ThemeIcon, Alert, Anchor, Divider } from '@mantine/core';
import { IconAlertCircle, IconBrandGithub, IconInfoCircle } from '@tabler/icons-react';
import iconSvg from '../assets/icon.svg';

export function HomePage() {
  return (
    <Container size="xl" py="xl">
      {/* 头部标题 */}
      <div className="text-center">
        <Group justify="center" gap="md" className="mb-3">
          <img src={iconSvg} alt="Majdata Hub" style={{ width: 48, height: 48 }} />
          <Title order={1} style={{ fontSize: '2.5rem', fontWeight: 800 }}>
            欢迎来到 Majdata Hub
          </Title>
        </Group>
        <Text c="dimmed" size="xl">
          Majdata 小工具
        </Text>
        <Group justify="center" gap="xs">
          <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            开源免费
          </Badge>
          <Badge size="lg" variant="gradient" gradient={{ from: 'grape', to: 'violet' }}>
            社区驱动
          </Badge>
        </Group>
      </div>

      {/* 重要声明区域 */}
      <div className="space-y-4">
        <Alert mt='sm' icon={<IconAlertCircle size={20} />} title="重要提示" color="red" variant="filled">
          <Text size="sm">
            我们<strong>不提倡</strong>使用 MajdataPlay 游玩本家谱面，请支持街机游戏！
          </Text>
          <Text size="sm">
            请勿将其他软件的游玩视频标为 MajdataPlay，但是当然欢迎你分享真 MajdataPlay 的游玩视频！
          </Text>
        </Alert>

        <Alert mt='sm' icon={<IconInfoCircle size={20} />} title="免责声明" color="yellow" variant="light">
          <Text size="sm">
            本软件为<strong>开源免费软件</strong>，开发者不做任何保证。使用本软件即表示您接受相关风险。
          </Text>
        </Alert>
      </div>

      {/* 项目信息和链接 */}
      <Card mt='sm' shadow="sm" padding="lg" radius="md" withBorder>
        <Group align="center">
          <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconBrandGithub size={20} />
          </ThemeIcon>
          <Title order={3}>关于我们</Title>
        </Group>

        <Divider mt='sm' />

        <Group mt='sm'>
          <Anchor
            href="https://github.com/TeamMajdata"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            fw={600}
          >
            TeamMajdata
          </Anchor>
          <Text size="sm">
            是一个非盈利性组织，核心理念是<strong>开源、社区驱动</strong>
          </Text>
        </Group>

        <Divider mt='sm' />

        <div className="space-y-3">
          <div>
            <Text size="sm" c="dimmed" className="mb-1">项目</Text>
            <Stack gap="sm" align="flex-start">
              <Anchor
                href="https://github.com/LingFeng-bbben/MajdataPlay"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={600}
              >
                MajdataPlay
              </Anchor>
              <Anchor
                href="https://github.com/kirisamevanilla/MajdataHub"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={600}
              >
                Majdata Hub
              </Anchor>
              <Anchor
                href="https://github.com/LingFeng-bbben/Majdata-Online"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={600}
              >
                Majdata-Online
              </Anchor>
            </Stack>
          </div>
        </div>
      </Card>
    </Container>
  );
}
