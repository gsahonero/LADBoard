/**
 * Navigation Component (Responsive Desktop Sidebar & Mobile Bottom Bar)
 * Featuring sliding layout indicator and smooth calm transitions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../core/i18n/i18n-context';
import {
  LayoutDashboard,
  Bell,
  Calendar,
  GitGraph,
  Users,
  History,
  Settings,
  Sliders,
  Grid,
} from 'lucide-react';

export type ActiveTab =
  | 'hub'
  | 'board'
  | 'topic'
  | 'attention'
  | 'time'
  | 'graph'
  | 'people'
  | 'history'
  | 'settings'
  | 'global_settings'
  | 'create_space';

export const Navigation: React.FC<{
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  attentionCount: number;
}> = ({ activeTab, onSelectTab, attentionCount }) => {
  const { t } = useI18n();

  const navItems: Array<{ id: ActiveTab; label: string; icon: any; badge?: number }> = [
    { id: 'hub', label: t('nav.hub'), icon: LayoutDashboard },
    { id: 'board', label: t('nav.board'), icon: Grid },
    { id: 'attention', label: t('nav.attention'), icon: Bell, badge: attentionCount },
    { id: 'time', label: t('nav.time'), icon: Calendar },
    { id: 'graph', label: t('nav.graph'), icon: GitGraph },
    { id: 'people', label: t('nav.people'), icon: Users },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'settings', label: t('nav.spaceSettings'), icon: Sliders },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-56 border-r border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur min-h-[calc(100vh-57px)] p-3">
        <nav className="space-y-1 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'hub' && activeTab === 'topic');
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl transition-colors duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 4px 15px -3px var(--color-glow)',
                    }}
                    className="absolute inset-0 rounded-2xl shadow-sm z-0"
                  />
                )}
                <div className="flex items-center gap-2.5 relative z-10">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={isActive ? { color: 'var(--color-primary-dark)' } : undefined}
                    className={`relative z-10 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-white' : 'bg-amber-500 text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Bar Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 px-2 pt-1.5 pb-3 flex items-center justify-around shadow-2xl">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'hub' && activeTab === 'topic');
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectTab(item.id)}
              style={isActive ? { color: 'var(--color-primary)' } : undefined}
              className={`relative flex flex-col items-center py-1 px-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
                isActive ? '' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="mt-0.5 truncate max-w-[60px]">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0.5 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </motion.button>
          );
        })}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center py-1 px-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="mt-0.5">{t('nav.settings')}</span>
        </motion.button>
      </nav>
    </>
  );
};
