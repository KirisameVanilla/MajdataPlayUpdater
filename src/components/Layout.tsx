import { AppShell, Group, Text } from '@mantine/core';
import { NavBar } from './NavBar';
import iconSvg from '../assets/icon.svg';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 60,
        breakpoint: 'sm',
      }}
      padding="md"
      className="h-screen"
    >
      <AppShell.Header className="border-gray-200 border-b">
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <img src={iconSvg} alt="Majdata Hub" style={{ width: 32, height: 32 }} />
            <Text size="xl" fw={700}>
              Majdata Hub
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="p-0">
        <NavBar />
      </AppShell.Navbar>

      <AppShell.Main className="bg-white" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 60px)' }}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
