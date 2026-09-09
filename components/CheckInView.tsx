'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  UserPlus,
  Phone,
  User,
  ShieldCheck,
  RotateCcw,
  X,
  Filter,
} from 'lucide-react';
import { PesertaLomba, COMPETITION_CATEGORIES, getCategoryByPrefix } from '@/types/peserta';

interface CheckInViewProps {
  pesertaList: PesertaLomba[];
  onCheckIn: (id: string) => Promise<void>;
  onRevertStatus: (id: string) => Promise<void>;
  onOpenAddModal: () => void;
}

export const CheckInView: React.FC<CheckInViewProps> = ({
  pesertaList,
  onCheckIn,
  onRevertStatus,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM_HADIR' | 'SUDAH_HADIR'>('BELUM_HADIR');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastCheckedName, setLastCheckedName] = useState<string | null>(null);

  // Filter logic
  const filteredPeserta = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return pesertaList.filter((p) => {
      // Status filter
      if (statusFilter === 'BELUM_HADIR' && p.status_kehadiran !== 'BELUM_HADIR') return false;
      if (statusFilter === 'SUDAH_HADIR' && p.status_kehadiran !== 'SUDAH_HADIR') return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const prefix = selectedCategory;
        if (!p.nomor_peserta.startsWith(prefix)) return false;
      }

      // Search query (Nama / Nomor / WA)
      if (q) {
        const matchNama = p.nama_anak.toLowerCase().includes(q);
        const matchNomor = p.nomor_peserta.toLowerCase().includes(q);
        const matchWa = p.nomor_wa.toLowerCase().includes(q);
        const matchPendamping = p.nama_pendamping.toLowerCase().includes(q);
        if (!matchNama && !matchNomor && !matchWa && !matchPendamping) return false;
      }

      return true;
    });
  }, [pesertaList, searchQuery, selectedCategory, statusFilter]);

  const handleSingleTapCheckIn = async (peserta: PesertaLomba) => {
    setLoadingId(peserta.id);
    try {
      await onCheckIn(peserta.id);
      setLastCheckedName(peserta.nama_anak);
      setTimeout(() => setLastCheckedName(null), 3000);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRevert = async (id: string) => {
    setLoadingId(id);
    try {
      await onRevertStatus(id);
    } finally {
      setLoadingId(null);
    }
  };

  // Counts for quick tabs
  const totalBelum = pesertaList.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
  const totalHadir = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner Notice */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Pintu Masuk • Registrasi Ulang
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Konfirmasi kehadiran peserta saat tiba di pos registrasi Masjid
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 min-h-[42px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Peserta Baru</span>
          </button>
        </div>

        {/* Search Bar - Instant thumb friendly */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Nama Anak, No. Peserta (misal: MW-001), atau No. WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 rounded-xl transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filters & Counters */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter('BELUM_HADIR')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              statusFilter === 'BELUM_HADIR'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Belum Hadir</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === 'BELUM_HADIR' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {totalBelum}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('SUDAH_HADIR')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              statusFilter === 'SUDAH_HADIR'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Sudah Hadir</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === 'SUDAH_HADIR' ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {totalHadir}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${
              statusFilter === 'ALL'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Status ({pesertaList.length})
          </button>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-teal-50 text-teal-800 border border-teal-300 font-bold'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Semua Lomba
          </button>
          {COMPETITION_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.prefix;
            const count = pesertaList.filter((p) => p.nomor_peserta.startsWith(cat.prefix)).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.prefix)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-teal-700 text-teal-100' : 'bg-gray-200 text-gray-700'
                }`}>
                  {cat.prefix}
                </span>
                <span>{cat.name.replace('Lomba ', '').split(' (')[0]}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Success Toast */}
      {lastCheckedName && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Berhasil check-in: <strong>{lastCheckedName}</strong></span>
          </div>
          <span className="text-[10px] text-emerald-100">Tercatat di sistem</span>
        </div>
      )}

      {/* Participant List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-medium">
          <span>Menampilkan {filteredPeserta.length} Peserta</span>
          {searchQuery && (
            <span className="text-teal-700">Filter pencarian aktif</span>
          )}
        </div>

        {filteredPeserta.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Peserta Tidak Ditemukan</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
              Tidak ada peserta yang cocok dengan filter atau kata kunci &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
            >
              + Daftarkan Sebagai Peserta Baru
            </button>
          </div>
        ) : (
          filteredPeserta.map((peserta) => {
            const isHadirloc = peserta.status_kehadiran === 'SUDAH_HADIR';
            const isPulang = peserta.status_kehadiran === 'SUDAH_PULANG';
            const prefix = peserta.nomor_peserta.split('-')[0];
            const cat = getCategoryByPrefix(prefix);
            const isLoading = loadingId === peserta.id;

            return (
              <div
                key={peserta.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-150 shadow-xs ${
                  isHadirloc
                    ? 'border-teal-300 bg-teal-50/20'
                    : isPulang
                    ? 'border-gray-200 opacity-75'
                    : 'border-gray-200 hover:border-teal-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  {/* Left: Badge & Name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold tracking-wide bg-gray-900 text-white">
                        {peserta.nomor_peserta}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          cat?.badgeBg || 'bg-gray-100'
                        } ${cat?.badgeText || 'text-gray-700'} ${cat?.borderColor || 'border-gray-200'}`}
                      >
                        {peserta.jenis_lomba.replace('Lomba ', '')}
                      </span>
                      {peserta.wajib_dijemput ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Dijemput
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Mandiri
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug">
                      {peserta.nama_anak}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {peserta.tingkat_sekolah} • {peserta.usia} Tahun
                    </p>
                  </div>

                  {/* Status Tag */}
                  <div className="shrink-0 text-right">
                    {isHadirloc ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        Di Lokasi
                      </span>
                    ) : isPulang ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Sudah Pulang
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        Belum Hadir
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      Pendamping:
                    </span>
                    <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                      {peserta.nama_pendamping}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      WhatsApp:
                    </span>
                    <a
                      href={`https://wa.me/${peserta.nomor_wa.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-teal-700 hover:underline font-semibold"
                    >
                      {peserta.nomor_wa}
                    </a>
                  </div>
                  {peserta.waktu_daftar_ulang && (
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5 border-t border-gray-200/60">
                      <span>Waktu Masuk:</span>
                      <span className="font-mono">
                        {new Date(peserta.waktu_daftar_ulang).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Single-tap Action Button */}
                <div className="flex items-center gap-2">
                  {!isHadirloc && !isPulang ? (
                    <button
                      onClick={() => handleSingleTapCheckIn(peserta)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-xs transition-all min-h-[46px]"
                    >
                      <UserCheck className="w-4 h-4" />
                      {isLoading ? 'Memproses...' : 'Konfirmasi Daftar Ulang'}
                    </button>
                  ) : isHadirloc ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-teal-800 font-semibold px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl flex-1">
                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Peserta sudah di arena lomba</span>
                      </div>
                      <button
                        onClick={() => handleRevert(peserta.id)}
                        disabled={isLoading}
                        title="Batalkan status hadir jika salah klik"
                        className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Batal</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500 font-medium px-3 py-2 bg-gray-100 rounded-xl flex-1">
                        Lomba selesai & telah pulang
                      </div>
                      <button
                        onClick={() => handleRevert(peserta.id)}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-orange-700 hover:bg-orange-50 border border-gray-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
