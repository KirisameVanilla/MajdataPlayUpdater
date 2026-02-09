import { Container, Title, Text } from '@mantine/core';

export function ChartPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} className="mb-4">
        谱面管理
      </Title>
      <Text c="dimmed" size="lg">
        谱面管理功能开发中...
      </Text>
    </Container>
  );
}
