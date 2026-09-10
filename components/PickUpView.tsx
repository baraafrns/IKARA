'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Phone,
  User,
  AlertTriangle,
  Clock,
  RotateCcw,
  MessageCircle,
  ExternalLink,
  X,
  UserCheck,
} from 'lucide-react';
import { PesertaLomba, getCategoryByPrefix } from '@/types/peserta';

interface PickUpViewProps {
  pesertaList: PesertaLomba[];
  onCheckOut: (id: string) => Promise<void>;
  onRevertStatus: (id: string) => Promise<void>;
}

export const PickUpView: React.FC<PickUpViewProps> = ({
  pesertaList,
  onCheckOut,
  onRevertStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'SIAP_JEMPUT' | 'SUDAH_PULANG' | 'SEMUA'>('SIAP_JEMPUT');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
  const [lastCheckoutName, setLastCheckoutName] = useState<string | null>(null);

  // Filter list
  const filteredPeserta = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return pesertaList.filter((p) => {
      // Filter tab
      if (filterMode === 'SIAP_JEMPUT' && p.status_kehadiran !== 'SUDAH_HADIR') return false;
      if (filterMode === 'SUDAH_PULANG' && p.status_kehadiran !== 'SUDAH_PULANG') return false;

      // Search
      if (q) {
        const matchNama = p.nama_anak.toLowerCase().includes(q);
        const matchNomor = p.nomor_peserta.toLowerCase().includes(q);
        const matchWa = p.nomor_wa.toLowerCase().includes(q);
        const matchPendamping = p.nama_pendamping.toLowerCase().includes(q);
        if (!matchNama && !matchNomor && !matchWa && !matchPendamping) return false;
      }

      return true;
    });
  }, [pesertaList, searchQuery, filterMode]);

  const handleToggleVerify = (id: string) => {
    setVerifiedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirmPickUp = async (peserta: PesertaLomba) => {
    setLoadingId(peserta.id);
    try {
      await onCheckOut(peserta.id);
      setLastCheckoutName(peserta.nama_anak);
      setTimeout(() => setLastCheckoutName(null), 3500);
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

  // Counts
  const countDiLokasi = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;
  const countSudahPulang = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length;
  const countWajibJemput = pesertaList.filter(
    (p) => p.status_kehadiran === 'SUDAH_HADIR' && p.wajib_dijemput
  ).length;

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner Notice */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Pintu Keluar
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Protokol keselamatan anak: pastikan identitas penjemput sesuai data terdaftar
            </p>
          </div>
          {countWajibJemput > 0 && (
            <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{countWajibJemput} Dijemput</span>
            </div>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Nomor Peserta (misal: MW-001) atau Nama Anak..."
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

        {/* Segment Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterMode('SIAP_JEMPUT')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              filterMode === 'SIAP_JEMPUT'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Siap Dijemput (Di Lokasi)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterMode === 'SIAP_JEMPUT' ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {countDiLokasi}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('SUDAH_PULANG')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              filterMode === 'SUDAH_PULANG'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Sudah Pulang</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterMode === 'SUDAH_PULANG' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {countSudahPulang}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('SEMUA')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${
              filterMode === 'SEMUA'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Data ({pesertaList.length})
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      {lastCheckoutName && (
        <div className="bg-teal-700 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-200 shrink-0" />
            <span>Update status peserta: <strong>{lastCheckoutName}</strong></span>
          </div>
          <span className="text-[10px] text-teal-100">Status: Sudah Pulang</span>
        </div>
      )}

      {/* Pick-up List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-medium">
          <span>Menampilkan {filteredPeserta.length} Peserta</span>
          <span className="text-gray-400">Pos Pintu Keluar</span>
        </div>

        {filteredPeserta.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Tidak Ada Peserta Terkait</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {filterMode === 'SIAP_JEMPUT'
                ? 'Belum ada peserta dengan status "Di Lokasi" yang menunggu penjemputan.'
                : 'Tidak ada data yang cocok dengan kriteria filter.'}
            </p>
          </div>
        ) : (
          filteredPeserta.map((peserta) => {
            const isHadirloc = peserta.status_kehadiran === 'SUDAH_HADIR';
            const isPulang = peserta.status_kehadiran === 'SUDAH_PULANG';
            const isBelumHadir = peserta.status_kehadiran === 'BELUM_HADIR';
            const prefix = peserta.nomor_peserta.split('-')[0];
            const cat = getCategoryByPrefix(prefix);
            const isLoading = loadingId === peserta.id;
            const isVerifiedChecked = !!verifiedMap[peserta.id];

            // WhatsApp link with pre-filled message
            const cleanPhone = peserta.nomor_wa.replace(/[^0-9]/g, '');
            const waPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
            const waMessage = encodeURIComponent(
              `Assalamu'alaikum wr. wb. Panitia Lomba Masjid IKARA menginformasikan bahwa ananda ${peserta.nama_anak} (No: ${peserta.nomor_peserta}) telah menyelesaikan kegiatan lomba dan siap dijemput di Pos Pintu Keluar Masjid.`
            );

            return (
              <div
                key={peserta.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-150 shadow-xs ${
                  peserta.wajib_dijemput && isHadirloc
                    ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/10'
                    : isPulang
                    ? 'border-gray-200 bg-gray-50/50'
                    : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
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
                    </div>

                    <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug">
                      {peserta.nama_anak}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {peserta.tingkat_sekolah} • {peserta.usia} Tahun
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 text-right">
                    {isHadirloc ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        Di Lokasi
                      </span>
                    ) : isPulang ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sudah Pulang
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Belum Hadir
                      </span>
                    )}
                  </div>
                </div>

                {/* SAFETY CHECK BANNER */}
                {peserta.wajib_dijemput ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 mb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Wajib Dijemput
                      </span>
                    </div>

                    <div className="text-xs space-y-1 pt-1 border-t border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800">Nama Pendamping:</span>
                        <strong className="text-amber-950 font-bold">{peserta.nama_pendamping}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800">Kontak:</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/${waPhone}?text=${waMessage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Hubungi</span>
                          </a>
                          <span className="font-mono font-semibold">{peserta.nomor_wa}</span>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox for Panitia Physical Verification */}
                    {isHadirloc && (
                      <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200/80 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isVerifiedChecked}
                          onChange={() => handleToggleVerify(peserta.id)}
                          className="w-4 h-4 rounded text-teal-600 border-gray-300 focus:ring-teal-500 mt-0.5 shrink-0"
                        />
                        <span className="text-[11px] text-amber-900 font-medium leading-tight">
                          Saya mengkonfirmasi bahwa peserta sudah dijemput: <strong>{peserta.nama_pendamping}</strong>
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Izin Pulang Mandiri</div>
                        <div className="text-[11px] text-blue-700">Anak diizinkan pulang sendiri tanpa pendamping</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Tidak dijemput
                    </span>
                  </div>
                )}

                {/* Timestamps Info */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3 px-1">
                  <span>
                    Masuk:{' '}
                    {peserta.waktu_daftar_ulang
                      ? new Date(peserta.waktu_daftar_ulang).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </span>
                  {peserta.waktu_pulang && (
                    <span>
                      Pulang:{' '}
                      {new Date(peserta.waktu_pulang).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isHadirloc ? (
                  <button
                    onClick={() => handleConfirmPickUp(peserta)}
                    disabled={isLoading || (peserta.wajib_dijemput && !isVerifiedChecked)}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold shadow-xs transition-all min-h-[46px] ${
                      peserta.wajib_dijemput && !isVerifiedChecked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isLoading ? 'Memproses...' : 'Konfirmasi Selesai / Dijemput'}
                  </button>
                ) : isPulang ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Anak telah dijemput / pulang</span>
                    </div>
                    <button
                      onClick={() => handleRevert(peserta.id)}
                      disabled={isLoading}
                      title="Batalkan jika salah pencet"
                      className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-700 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-xl border border-gray-100">
                    Peserta belum daftar ulang
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
