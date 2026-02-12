import { NavLink, ScrollArea } from '@mantine/core';
import { IconHome, IconChartBar, IconPalette, IconSettings, IconBug, IconDeviceGamepad2 } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { NavItem } from '../types';

const navItems: NavItem[] = [
  { label: 'Home', icon: IconHome, path: '/' },
  { label: 'Game', icon: IconDeviceGamepad2, path: '/game' },
  { label: 'Chart', icon: IconChartBar, path: '/chart' },
  { label: 'Skin', icon: IconPalette, path: '/skin' },
  { label: 'Setting', icon: IconSettings, path: '/setting' },
  { label: 'Debug', icon: IconBug, path: '/debug' },
];

export function NavBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.div
      initial={{ width: 60 }}
      animate={{ width: isExpanded ? 240 : 60 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="bg-gray-50 p-2 h-full"
    >
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              active={location.pathname === item.path}
              label={
                <motion.span
                  initial={false}
                  animate={{ 
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? 'auto' : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              }
              leftSection={<item.icon size={20} stroke={1.5} />}
              onClick={() => navigate(item.path)}
              className="rounded-lg h-10"
              classNames={{
                root: 'hover:bg-gray-200 transition-colors min-h-10',
                label: isExpanded ? '' : 'hidden',
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
