'use client';

import React from 'react';
import { UserCheck, ShieldAlert, BarChart3, UploadCloud } from 'lucide-react';

export type NavTab = 'checkin' | 'pickup' | 'dashboard' | 'import';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  countBelumHadir: number;
  countDiLokasi: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  countBelumHadir,
  countDiLokasi,
}) => {
  const tabs = [
    {
      id: 'checkin' as NavTab,
      label: 'Check-in',
      sublabel: 'Pintu Masuk',
      icon: UserCheck,
      badge: countBelumHadir > 0 ? countBelumHadir : undefined,
      badgeColor: 'bg-orange-500 text-white',
    },
    {
      id: 'pickup' as NavTab,
      label: 'Penjemputan',
      sublabel: 'Pintu Keluar',
      icon: ShieldAlert,
      badge: countDiLokasi > 0 ? countDiLokasi : undefined,
      badgeColor: 'bg-teal-600 text-white',
    },
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      sublabel: 'Statistik',
      icon: BarChart3,
    },
    {
      id: 'import' as NavTab,
      label: 'Impor Data',
      sublabel: 'Sync CSV/Sheet',
      icon: UploadCloud,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all duration-150 min-h-[52px] ${
                isActive
                  ? 'text-teal-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {/* Active Pill Indicator */}
              {isActive && (
                <span className="absolute top-0.5 w-8 h-1 rounded-full bg-teal-600" />
              )}

              <div className="relative mt-1">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-teal-600' : 'text-gray-500'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] tracking-tight mt-0.5 leading-tight font-medium">
                {tab.label}
              </span>
              <span className="text-[9px] text-gray-400 font-normal leading-none hidden sm:inline">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
