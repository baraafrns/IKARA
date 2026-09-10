'use client';

import React, { useState } from 'react';
import {
  Users,
  Clock,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Database,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PesertaLomba, COMPETITION_CATEGORIES } from '@/types/peserta';
import { exportPesertaToExcel } from '@/lib/export-excel';

interface DashboardViewProps {
  pesertaList: PesertaLomba[];
  onOpenSqlModal: () => void;
  onResetData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pesertaList,
  onOpenSqlModal,
  onResetData,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Metrics
  const totalPeserta = pesertaList.length;
  const belumHadir = pesertaList.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
  const diLokasi = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;
  const sudahPulang = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length;
  const percentHadir = totalPeserta > 0 ? Math.round(((diLokasi + sudahPulang) / totalPeserta) * 100) : 0;
  const wajibJemputCount = pesertaList.filter((p) => p.wajib_dijemput).length;

  // Chart Data: Breakdown per Category
  const barChartData = COMPETITION_CATEGORIES.map((cat) => {
    const list = pesertaList.filter(
      (p) => p.nomor_peserta.startsWith(cat.prefix) || p.jenis_lomba.includes(cat.name)
    );
    return {
      name: cat.prefix,
      fullName: cat.name.split(' (')[0],
      'Belum Hadir': list.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length,
      'Di Lokasi': list.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length,
      'Sudah Pulang': list.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length,
      total: list.length,
    };
  });

  // Pie Chart Data: Overall Presence
  const pieChartData = [
    { name: 'Di Lokasi', value: diLokasi, color: '#0D9488' }, // Teal
    { name: 'Belum Hadir', value: belumHadir, color: '#FB923C' }, // Orange
    { name: 'Sudah Pulang', value: sudahPulang, color: '#059669' }, // Emerald
  ].filter((d) => d.value > 0);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportPesertaToExcel(pesertaList, 'IKARA_Data_Peserta_Lomba');
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header & Export CTA */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Dashboard & Analitik Kehadiran
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ringkasan kehadiran real-time & laporan unduhan lomba Masjid IKARA
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            disabled={isExporting || totalPeserta === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all min-h-[42px]"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Menyiapkan...' : 'Ekspor Laporan (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Laporan Excel berhasil diunduh ke perangkat Anda!</span>
          </div>
          <span className="text-[11px] text-emerald-600">Format .xlsx lengkap dengan stempel waktu</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Peserta */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Total Peserta</span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">{totalPeserta}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            6 Kategori Lomba Terdaftar
          </div>
        </div>

        {/* Belum Hadir */}
        <div className="bg-white rounded-2xl p-4 border border-orange-200 bg-orange-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-800">Belum Hadir</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-600 tracking-tight">{belumHadir}</div>
          <div className="text-[11px] text-orange-700 mt-1">
            Menunggu di Pintu Masuk
          </div>
        </div>

        {/* Di Lokasi */}
        <div className="bg-white rounded-2xl p-4 border border-teal-200 bg-teal-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-teal-800">Di Lokasi (Hadir)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-700 tracking-tight">{diLokasi}</div>
          <div className="text-[11px] text-teal-700 mt-1">
            Aktif di Arena Kompetisi
          </div>
        </div>

        {/* Sudah Pulang */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-800">Sudah Pulang</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight">{sudahPulang}</div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Verifikasi Selesai di Pintu Keluar
          </div>
        </div>
      </div>

      {/* Progress & Safety Banner */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-gray-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Tingkat Kehadiran Keseluruhan
          </span>
          <span className="font-bold text-teal-700">{percentHadir}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${totalPeserta ? (diLokasi / totalPeserta) * 100 : 0}%` }}
            className="bg-teal-600 transition-all duration-300"
            title="Di Lokasi"
          />
          <div
            style={{ width: `${totalPeserta ? (sudahPulang / totalPeserta) * 100 : 0}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title="Sudah Pulang"
          />
          <div
            style={{ width: `${totalPeserta ? (belumHadir / totalPeserta) * 100 : 0}%` }}
            className="bg-orange-300 transition-all duration-300"
            title="Belum Hadir"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-600" /> Di Lokasi ({diLokasi})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sudah Pulang ({sudahPulang})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-300" /> Belum Hadir ({belumHadir})
          </span>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart per Category */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Distribusi Kehadiran per Kategori</h3>
              <p className="text-[11px] text-gray-500">Perbandingan status kehadiran setiap jenis lomba</p>
            </div>
            <span className="text-[10px] font-semibold text-gray-400">Prefix Kode</span>
          </div>

          <div className="w-full h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} />
                <YAxis stroke="#6B7280" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    borderColor: '#374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Di Lokasi" fill="#0D9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Belum Hadir" fill="#FB923C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sudah Pulang" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Proporsi Kehadiran */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Proporsi Kehadiran</h3>
            <p className="text-[11px] text-gray-500">Status terkini seluruh anak</p>
          </div>

          <div className="w-full h-52 my-auto">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Belum ada data kehadiran
              </div>
            )}
          </div>

          <div className="space-y-1 text-xs pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-teal-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Di Lokasi
              </span>
              <span className="font-bold">{diLokasi} Peserta</span>
            </div>
            <div className="flex items-center justify-between text-orange-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Belum Hadir
              </span>
              <span className="font-bold">{belumHadir} Peserta</span>
            </div>
            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Sudah Pulang
              </span>
              <span className="font-bold">{sudahPulang} Peserta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Tabel Rekapitulasi per Kategori Lomba</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 font-semibold">
              <th className="pb-2">Prefix</th>
              <th className="pb-2">Kategori Lomba</th>
              <th className="pb-2">Target</th>
              <th className="pb-2 text-right">Total</th>
              <th className="pb-2 text-right">Belum Hadir</th>
              <th className="pb-2 text-right">Di Lokasi</th>
              <th className="pb-2 text-right">Pulang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {COMPETITION_CATEGORIES.map((cat) => {
              const list = pesertaList.filter(
                (p) => p.nomor_peserta.startsWith(cat.prefix) || p.jenis_lomba.includes(cat.name)
              );
              const bHadir = list.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
              const dLok = list.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;
              const sPul = list.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length;

              return (
                <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 font-bold font-mono text-gray-900">{cat.prefix}</td>
                  <td className="py-2.5 font-medium text-gray-800">{cat.name.split(' (')[0]}</td>
                  <td className="py-2.5 text-gray-500">{cat.targetClass}</td>
                  <td className="py-2.5 text-right font-bold">{list.length}</td>
                  <td className="py-2.5 text-right text-orange-600 font-semibold">{bHadir}</td>
                  <td className="py-2.5 text-right text-teal-700 font-semibold">{dLok}</td>
                  <td className="py-2.5 text-right text-emerald-700 font-semibold">{sPul}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Operational Actions */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Database & Sinkronisasi Acara</h4>
            <p className="text-[11px] text-gray-500">
              Terhubung dengan arsitektur PostgreSQL Supabase & offline-first cache
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenSqlModal}
            className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Skrip SQL Supabase
          </button>
          <button
            onClick={() => {
              if (confirm('Kembalikan data ke 10 peserta sampel simulasi awal?')) {
                onResetData();
              }
            }}
            className="flex-1 sm:flex-initial px-3 py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
