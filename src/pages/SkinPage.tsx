import { Container, Title, Text } from '@mantine/core';

export function SkinPage() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} className="mb-4">
        皮肤管理
      </Title>
      <Text c="dimmed" size="lg">
        皮肤管理功能开发中...
      </Text>
    </Container>
  );
}
