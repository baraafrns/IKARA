'use client';

import React, { useState } from 'react';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { PesertaLomba, COMPETITION_CATEGORIES, CompetitionCategory } from '@/types/peserta';
import { getNextSequencePerCategory } from '@/lib/parser';

interface AddPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (peserta: PesertaLomba) => void;
  existingList: PesertaLomba[];
}

export const AddPesertaModal: React.FC<AddPesertaModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingList,
}) => {
  const [selectedCat, setSelectedCat] = useState<CompetitionCategory>(COMPETITION_CATEGORIES[0]);
  const [namaAnak, setNamaAnak] = useState('');
  const [usia, setUsia] = useState<number>(6);
  const [tingkatSekolah, setTingkatSekolah] = useState('TK B');
  const [namaPendamping, setNamaPendamping] = useState('');
  const [nomorWa, setNomorWa] = useState('');
  const [wajibDijemput, setWajibDijemput] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaAnak.trim()) return;

    // Calculate next sequential number for this category
    const seq = getNextSequencePerCategory(existingList);
    const nextNum = (seq[selectedCat.prefix] || 0) + 1;
    const nomorPeserta = `${selectedCat.prefix}-${String(nextNum).padStart(3, '0')}`;

    const newPeserta: PesertaLomba = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `walkin-${Date.now()}`,
      nomor_peserta: nomorPeserta,
      nama_anak: namaAnak.trim(),
      usia: Number(usia) || 7,
      tingkat_sekolah: tingkatSekolah.trim() || selectedCat.targetClass,
      jenis_lomba: selectedCat.name,
      nama_pendamping: namaPendamping.trim() || 'Orang Tua / Wali',
      nomor_wa: nomorWa.trim() || '-',
      wajib_dijemput: wajibDijemput,
      status_kehadiran: 'SUDAH_HADIR', // usually walk-ins are physically right there!
      waktu_daftar_ulang: new Date().toISOString(),
      waktu_pulang: null,
      created_at: new Date().toISOString(),
    };

    onAdd(newPeserta);
    onClose();
    // reset
    setNamaAnak('');
    setNamaPendamping('');
    setNomorWa('');
  };

  const handleCategoryChange = (cat: CompetitionCategory) => {
    setSelectedCat(cat);
    if (cat.prefix === 'MW') {
      setUsia(5);
      setTingkatSekolah('TK / PAUD');
    } else if (cat.prefix === 'MG') {
      setUsia(8);
      setTingkatSekolah('Kelas 2 SD');
    } else if (cat.prefix === 'AZ' || cat.prefix === 'HQ' || cat.prefix === 'CCSD') {
      setUsia(11);
      setTingkatSekolah('Kelas 5 SD');
    } else if (cat.prefix === 'CCSMP') {
      setUsia(14);
      setTingkatSekolah('Kelas 8 SMP');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Tambah Peserta Baru (On-the-spot)</h2>
              <p className="text-xs text-gray-500">Registrasi langsung di lokasi acara Masjid IKARA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Pilih Kategori Lomba
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMPETITION_CATEGORIES.map((cat) => {
                const isSelected = selectedCat.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900 shadow-xs ring-1 ring-teal-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-gray-200 text-gray-700">
                        {cat.prefix}
                      </span>
                      <span className="text-[10px] text-gray-400">{cat.targetClass}</span>
                    </div>
                    <div className="truncate text-xs">{cat.name.split(' (')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nama Lengkap Anak <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Muhammad Farhan"
              value={namaAnak}
              onChange={(e) => setNamaAnak(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Usia (Tahun)
              </label>
              <input
                type="number"
                min="3"
                max="18"
                value={usia}
                onChange={(e) => setUsia(parseInt(e.target.value, 10) || 7)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kelas / Sekolah
              </label>
              <input
                type="text"
                value={tingkatSekolah}
                onChange={(e) => setTingkatSekolah(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Orang Tua / Pendamping
              </label>
              <input
                type="text"
                placeholder="Contoh: Ibu Fatimah"
                value={namaPendamping}
                onChange={(e) => setNamaPendamping(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                No. WhatsApp Aktif
              </label>
              <input
                type="text"
                placeholder="08123456789"
                value={nomorWa}
                onChange={(e) => setNomorWa(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Child Pick-up Safety Check */}
          <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-800">Status Penjemputan Anak</div>
              <div className="text-[11px] text-gray-500">
                {wajibDijemput
                  ? 'Wajib dijemput oleh orang tua/wali (Diperiksa di Pintu Keluar)'
                  : 'Anak diizinkan pulang sendiri tanpa pendamping'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWajibDijemput(!wajibDijemput)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                wajibDijemput
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {wajibDijemput ? 'Wajib Dijemput' : 'Pulang Sendiri'}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Simpan & Langsung Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
