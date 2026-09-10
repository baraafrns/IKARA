'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { CheckInView } from '@/components/CheckInView';
import { PickUpView } from '@/components/PickUpView';
import { DashboardView } from '@/components/DashboardView';
import { ImportView } from '@/components/ImportView';
import { SqlModal } from '@/components/SqlModal';
import { AddPesertaModal } from '@/components/AddPesertaModal';
import {
  PesertaLomba,
  StatusKehadiran,
} from '@/types/peserta';
import {
  fetchAllPeserta,
  updatePesertaStatus,
  addNewPeserta,
  upsertPesertaList,
  resetAllDataToSample,
  getSupabaseClient,
  syncRemoteConfig,
} from '@/lib/supabase';
import { UserCheck, ShieldAlert, BarChart3, UploadCloud, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('checkin');
  const [pesertaList, setPesertaList] = useState<PesertaLomba[]>([]);
  // Default to Supabase API directly
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('supabase');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load data callback
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncRemoteConfig();
      const res = await fetchAllPeserta();
      setPesertaList(res.data);
      setDataSource(res.source);
      if (res.error) {
        setApiErrorMessage(res.error);
      } else {
        setApiErrorMessage(null);
      }
    } catch (err) {
      console.error('Error loading peserta:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function initConnection() {
      setIsLoading(true);
      try {
        // 1. Sync remote config from server if available
        await syncRemoteConfig();

        // 2. Fetch live data from Supabase API
        const res = await fetchAllPeserta();
        if (isSubscribed) {
          setPesertaList(res.data);
          setDataSource(res.source);
          if (res.error) {
            setApiErrorMessage(res.error);
          } else {
            setApiErrorMessage(null);
          }
        }

        // 3. Setup Supabase Realtime subscription
        const client = getSupabaseClient();
        if (client && isSubscribed) {
          const channel = client
            .channel('realtime_peserta_lomba')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'peserta_lomba' },
              () => {
                fetchAllPeserta().then((latestRes) => {
                  if (isSubscribed) {
                    setPesertaList(latestRes.data);
                    setDataSource(latestRes.source);
                    if (latestRes.error) {
                      setApiErrorMessage(latestRes.error);
                    } else {
                      setApiErrorMessage(null);
                    }
                  }
                });
              }
            )
            .subscribe();

          return () => {
            client.removeChannel(channel);
          };
        }
      } catch (err) {
        console.error('Failed to init Supabase connection:', err);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    initConnection();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Check-in action
  const handleCheckIn = async (id: string) => {
    // Optimistic UI update
    const nowIso = new Date().toISOString();
    setPesertaList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status_kehadiran: 'SUDAH_HADIR',
              waktu_daftar_ulang: nowIso,
            }
          : p
      )
    );
    await updatePesertaStatus(id, 'SUDAH_HADIR', nowIso);
  };

  // Check-out action
  const handleCheckOut = async (id: string) => {
    const nowIso = new Date().toISOString();
    setPesertaList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status_kehadiran: 'SUDAH_PULANG',
              waktu_pulang: nowIso,
            }
          : p
      )
    );
    await updatePesertaStatus(id, 'SUDAH_PULANG', nowIso);
  };

  // Revert status
  const handleRevertStatus = async (id: string) => {
    setPesertaList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status_kehadiran: 'BELUM_HADIR',
              waktu_daftar_ulang: null,
              waktu_pulang: null,
            }
          : p
      )
    );
    await updatePesertaStatus(id, 'BELUM_HADIR');
  };

  // Add new participant
  const handleAddPeserta = async (newPeserta: PesertaLomba) => {
    setPesertaList((prev) => [newPeserta, ...prev]);
    await addNewPeserta(newPeserta);
  };

  // Upsert batch from Import
  const handleImportSuccess = async (newList: PesertaLomba[]) => {
    await upsertPesertaList(newList);
    await loadData();
    setActiveTab('checkin');
  };

  // Reset demo
  const handleResetData = async () => {
    setIsLoading(true);
    const resetList = await resetAllDataToSample();
    setPesertaList(resetList);
    setIsLoading(false);
  };

  const countBelumHadir = pesertaList.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
  const countDiLokasi = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Top Bar */}
      <Navbar
        totalPeserta={pesertaList.length}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Supabase Error Notice Banner */}
      {apiErrorMessage && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Perhatian Supabase:</strong>{' '}
                {apiErrorMessage.includes('Invalid path')
                  ? 'URL Supabase salah format. Gunakan Project URL dari Project Settings > API: https://[id-proyek].supabase.co (bukan link browser dashboard).'
                  : apiErrorMessage.includes('permission denied')
                  ? 'Izin tabel belum diberikan ke role anon. Jalankan skrip GRANT SQL di menu Database pada SQL Editor Supabase Anda.'
                  : apiErrorMessage.includes('Invalid API key') || apiErrorMessage.includes('apiKey')
                  ? 'API Key Supabase tidak valid. Pastikan memakai kunci "anon public" (bukan service_role/password) dan tanpa tanda petik.'
                  : apiErrorMessage}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsSqlModalOpen(true)}
                className="font-bold underline text-amber-900 hover:text-amber-950"
              >
                Ubah Key di Sini
              </button>
              <button
                onClick={() => setApiErrorMessage(null)}
                className="text-amber-700 hover:text-amber-900 text-[11px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation Tabs (Hidden on mobile, mobile uses BottomNav) */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('checkin')}
              className={`py-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'checkin'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Pintu Masuk (Check-in)</span>
              {countBelumHadir > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  {countBelumHadir}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pickup')}
              className={`py-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'pickup'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Pintu Keluar (Verifikasi Penjemputan)</span>
              {countDiLokasi > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                  {countDiLokasi}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard & Analitik</span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`py-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Impor Data & Sync</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] space-y-3">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-800">Menghubungkan ke API Supabase...</p>
            <p className="text-xs text-gray-500">Sinkronisasi data real-time peserta lomba</p>
          </div>
        ) : (
          <>
            {activeTab === 'checkin' && (
              <CheckInView
                pesertaList={pesertaList}
                onCheckIn={handleCheckIn}
                onRevertStatus={handleRevertStatus}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {activeTab === 'pickup' && (
              <PickUpView
                pesertaList={pesertaList}
                onCheckOut={handleCheckOut}
                onRevertStatus={handleRevertStatus}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                pesertaList={pesertaList}
                onOpenSqlModal={() => setIsSqlModalOpen(true)}
                onResetData={handleResetData}
              />
            )}

            {activeTab === 'import' && (
              <ImportView
                existingPeserta={pesertaList}
                onImportSuccess={handleImportSuccess}
                dataSource={dataSource}
                isLoading={isLoading}
                onOpenSqlModal={() => setIsSqlModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        countBelumHadir={countBelumHadir}
        countDiLokasi={countDiLokasi}
      />

      {/* Supabase SQL & Credentials Modal */}
      <SqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onConfigUpdated={loadData}
        onResetData={handleResetData}
      />

      {/* Walk-in Add Modal */}
      <AddPesertaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPeserta}
        existingList={pesertaList}
      />
    </div>
  );
}
