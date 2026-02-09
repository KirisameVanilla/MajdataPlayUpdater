export type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  path: string;
};

export type PageProps = {
  title: string;
};
