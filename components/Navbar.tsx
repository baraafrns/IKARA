'use client';

import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  totalPeserta: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalPeserta,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                  IKARA FESTIVAL
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wide">
                  DATA CENTER
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Sistem Pendataan • {totalPeserta} Peserta
              </p>
            </div>
          </div>

          {/* Action button: Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Segarkan Data"
              className="p-2 rounded-xl text-gray-600 hover:text-teal-700 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

