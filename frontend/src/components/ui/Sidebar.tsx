'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  Sun,
  Moon,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col
        bg-[var(--bg-card)] border-r border-[var(--border-primary)]
        transition-all duration-300 z-50
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600 text-white flex-shrink-0">
          <Zap size={20} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-[var(--text-primary)] whitespace-nowrap">
              D-Media
            </h1>
            <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
              Lead Engine
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 space-y-1 border-t border-[var(--border-primary)]">
        <button onClick={toggleTheme} className="sidebar-link w-full" title={collapsed ? 'Toggle theme' : undefined}>
          {theme === 'dark' ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={handleLogout} className="sidebar-link w-full" title={collapsed ? 'Log out' : undefined}>
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-link w-full"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRight size={20} className="flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft size={20} className="flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
