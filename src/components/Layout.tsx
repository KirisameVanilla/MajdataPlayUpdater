import { AppShell, Burger, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavBar } from './NavBar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 60,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      className="h-screen"
    >
      <AppShell.Header className="border-gray-200 border-b">
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700}>
              Majdata Hub
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="p-0">
        <NavBar />
      </AppShell.Navbar>

      <AppShell.Main className="bg-white overflow-y-auto">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
