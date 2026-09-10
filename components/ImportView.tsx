'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { PesertaLomba, getCategoryByPrefix } from '@/types/peserta';
import {
  parseCSVString,
  parseExcelArrayBuffer,
  fetchGoogleSheetsPublishedCSV,
  ParseResult,
} from '@/lib/parser';

interface ImportViewProps {
  existingPeserta: PesertaLomba[];
  onImportSuccess: (newList: PesertaLomba[]) => Promise<void>;
  dataSource?: 'supabase' | 'local';
  isLoading?: boolean;
  onOpenSqlModal?: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({
  existingPeserta,
  onImportSuccess,
  dataSource = 'supabase',
  isLoading = false,
  onOpenSqlModal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessingFile(true);
    setCurrentFileName(file.name);

    const fileName = file.name.toLowerCase();
    try {
      let result: ParseResult | null = null;

      // 1. Try Excel parser if extension matches Excel
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || file.type.includes('sheet') || file.type.includes('excel')) {
        const buffer = await file.arrayBuffer();
        result = parseExcelArrayBuffer(buffer, existingPeserta);
      } else {
        // 2. Default try CSV / text parser
        const text = await file.text();
        result = parseCSVString(text, existingPeserta);

        // If CSV parsing produced 0 peserta, maybe it's actually an Excel file renamed as CSV
        if (result.peserta.length === 0 && text.charCodeAt(0) === 0x50 && text.charCodeAt(1) === 0x4b) {
          // 'PK' header indicates a zipped XLSX file!
          const buffer = await file.arrayBuffer();
          result = parseExcelArrayBuffer(buffer, existingPeserta);
        }
      }

      if (!result || result.peserta.length === 0) {
        setErrorMessage(
          `File "${file.name}" terbaca tetapi tidak ditemukan data peserta yang valid. Pastikan terdapat kolom nama anak/peserta dan kategori lomba.`
        );
        setParseResult(null);
      } else {
        setParseResult(result);
        setSuccessMessage(`Berhasil membaca file "${file.name}"! Ditemukan ${result.peserta.length} data peserta yang siap disinkronkan.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses file';
      setErrorMessage(`Error membaca file: ${msg}`);
      setParseResult(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFetchGoogleSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSheetUrl.trim()) return;

    setIsFetchingUrl(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await fetchGoogleSheetsPublishedCSV(googleSheetUrl, existingPeserta);
      if (result.peserta.length === 0) {
        setErrorMessage('Tidak ada data peserta yang ditemukan dari tautan Google Sheets ini.');
      } else {
        setParseResult(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengambil data Google Sheets';
      setErrorMessage(msg);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Quick load demo Google Form CSV rows
  const handleLoadDemoCSV = () => {
    const demoCSV = `Timestamp,Nama Lengkap Anak,Nama Orang tua/Wali,No. Whatsapp Orang tua/Wali,Didampingi atau Sendiri,Lomba yang diminati (Pilih sesuai kelas)
09/09/2026 17:45:05,Hanif Al-Faruq,Bunda Anisa,081233445566,Didampingi,Lomba Mewarnai (TK / PAUD)
09/09/2026 18:00:12,Aisyah Zahira,Bapak Syamsul,081399001122,Didampingi,Lomba Menggambar (Kelas 1-3 SD)
09/09/2026 18:15:20,Ibrahim Qasim,Ustadz Abdullah,085712345678,Sendiri,Lomba Adzan (Kelas 4-6 SD)
09/09/2026 18:25:17,Fatimah Azzahra,Ibu Maryam,08888374626,Didampingi,Lomba Menghafal Qur'an (Kelas 4-6 SD)
09/09/2026 18:35:40,Regu Khalid bin Walid,Guru Pembina Pak Agus,081299884422,Didampingi,Lomba Cerdas Cermat SD (Kelas 4-6 SD)
09/09/2026 18:45:00,Regu Tariq bin Ziyad,Kakak Pembina Faisal,087811992233,Sendiri,Cerdas Cermat (SMP 7-9)`;

    const result = parseCSVString(demoCSV, existingPeserta);
    setParseResult(result);
    setSuccessMessage('Data formulir Google Form berhasil disimulasikan dan diparsing otomatis!');
  };

  const handleDownloadSampleCSV = () => {
    const sampleHeader = `Timestamp,Nama Lengkap Anak,Nama Orang tua/Wali,No. Whatsapp Orang tua/Wali,Didampingi atau Sendiri,Lomba yang diminati (Pilih sesuai kelas)
09/09/2026 08:00:00,Contoh Nama Anak 1,Bapak/Ibu Pendamping,081234567890,Didampingi,Lomba Mewarnai (TK / PAUD)
09/09/2026 08:05:00,Contoh Nama Anak 2,Kakak Pendamping,085711223344,Sendiri,Lomba Adzan (Kelas 4-6 SD)
09/09/2026 08:10:00,Contoh Nama Anak 3,Orang Tua,081399887766,Didampingi,Cerdas Cermat (SMP 7-9)`;

    const blob = new Blob([sampleHeader], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Pendaftaran_Lomba_IKARA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteUpsert = async () => {
    if (!parseResult || parseResult.peserta.length === 0) return;
    setIsImporting(true);
    setErrorMessage(null);
    try {
      await onImportSuccess(parseResult.peserta);
      setSuccessMessage(`Berhasil menyinkronkan ${parseResult.peserta.length} peserta ke database!`);
      setParseResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan data';
      setErrorMessage(`Gagal: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-600" />
            Impor Data & Sinkronisasi Peserta
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Unggah file formulir pendaftaran (.csv, .xlsx) atau tautan Google Sheets
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors border border-gray-200"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Template CSV</span>
        </button>
      </div>

      {/* Database & API Status Card */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                dataSource === 'supabase' ? 'bg-teal-50 text-teal-600' : 'bg-orange-50 text-orange-600'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Status Database
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isLoading
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : dataSource === 'supabase'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLoading
                        ? 'bg-amber-500 animate-ping'
                        : dataSource === 'supabase'
                        ? 'bg-teal-500 animate-pulse'
                        : 'bg-orange-500'
                    }`}
                  />
                  {isLoading
                    ? 'Menghubungkan ke API...'
                    : dataSource === 'supabase'
                    ? 'API CONNECTED (Supabase Cloud)'
                    : 'LOCAL STORAGE MODE (Offline)'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {dataSource === 'supabase'
                  ? 'Data peserta otomatis tersimpan aman di cloud Supabase & tersinkronisasi antar-perangkat secara realtime.'
                  : 'Data saat ini tersimpan di memori browser lokal. Hubungkan ke Supabase untuk sinkronisasi cloud multi-perangkat.'}
              </p>
            </div>
          </div>

          {onOpenSqlModal && (
            <button
              onClick={onOpenSqlModal}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                dataSource === 'supabase'
                  ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Pengaturan Database & SQL</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Upload Dropzone & Google Sheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method 1: File Dropzone (Drag & Drop + Manual Click) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Metode 1: Unggah File CSV / Excel
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Mendukung hasil ekspor Google Form atau template Excel peserta
            </p>

            {/* Native file input with reset-on-click */}
            <input
              id="csv-file-upload-input"
              type="file"
              ref={fileInputRef}
              onClick={(e) => {
                // Ensure re-selecting the same file triggers onChange
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
              accept=".csv,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls,application/octet-stream,*"
              className="sr-only"
            />

            <label
              htmlFor="csv-file-upload-input"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${
                isDragging
                  ? 'border-teal-600 bg-teal-50/70 scale-[1.01]'
                  : isProcessingFile
                  ? 'border-teal-400 bg-teal-50/30 animate-pulse'
                  : 'border-gray-300 hover:border-teal-500 hover:bg-slate-50/80 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2.5">
                {isProcessingFile ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>

              {isProcessingFile ? (
                <div>
                  <p className="text-xs font-bold text-teal-800">
                    Memproses {currentFileName || 'File'}...
                  </p>
                  <p className="text-[11px] text-teal-600 mt-1">Sedang membaca dan memverifikasi baris data...</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Tarik & Lepas file di sini, atau{' '}
                    <span className="text-teal-600 underline font-semibold">Klik untuk Pilih File</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Mendukung semua format .CSV, .XLSX, dan .XLS
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Buka File dari Perangkat</span>
                  </div>
                </div>
              )}
            </label>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Ingin coba langsung?</span>
            <button
              type="button"
              onClick={handleLoadDemoCSV}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Muat Contoh Data Google Form</span>
            </button>
          </div>
        </div>

        {/* Method 2: Google Sheets Live Sync */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-teal-600" />
              Metode 2: Tarik Tautan Google Sheets
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Masukkan tautan Google Sheets yang telah di-share atau di-publish sebagai CSV
            </p>

            <form onSubmit={handleFetchGoogleSheets} className="space-y-3">
              <div>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isFetchingUrl || !googleSheetUrl.trim()}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isFetchingUrl ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                <span>{isFetchingUrl ? 'Mengunduh Sheet...' : 'Tarik Data Google Sheets'}</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
            <div className="font-semibold text-gray-700">Petunjuk Google Sheet:</div>
            <div>Buka spreadsheet &gt; File &gt; Share &gt; Publish to web &gt; Pilih format <strong>CSV</strong>.</div>
          </div>
        </div>
      </div>

      {/* PREVIEW & UPSERT CONFIRMATION SECTION */}
      {parseResult && (
        <div className="bg-white rounded-2xl p-4 border border-teal-300 shadow-md animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                  Pratinjau Data Siap Impor
                </span>
                <span className="text-xs font-semibold text-gray-700">
                  {parseResult.peserta.length} Baris Peserta Terdeteksi
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Nomor peserta unik (MW, MG, AZ, HQ, CCSD, CCSMP) telah di-generate berurutan otomatis
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setParseResult(null)}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteUpsert}
                disabled={isImporting || parseResult.peserta.length === 0}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                {isImporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{isImporting ? 'Menyimpan...' : 'Simpan & Sinkronkan Data'}</span>
              </button>
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <div className="p-3 mb-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="font-bold mb-1">Catatan Parsing:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Table Preview */}
          <div className="overflow-x-auto max-h-72 border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 text-gray-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">No. Peserta (Auto)</th>
                  <th className="py-2.5 px-3">Nama Anak</th>
                  <th className="py-2.5 px-3">Jenis Lomba (Terdeteksi)</th>
                  <th className="py-2.5 px-3">Usia/Kelas</th>
                  <th className="py-2.5 px-3">Pendamping</th>
                  <th className="py-2.5 px-3">No. WA</th>
                  <th className="py-2.5 px-3">Penjemputan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parseResult.peserta.map((p, idx) => {
                  const prefix = p.nomor_peserta.split('-')[0];
                  const cat = getCategoryByPrefix(prefix);

                  return (
                    <tr key={idx} className="hover:bg-teal-50/20">
                      <td className="py-2 px-3 font-mono font-bold text-gray-900">
                        <span className="px-1.5 py-0.5 rounded bg-gray-900 text-white text-[11px]">
                          {p.nomor_peserta}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-800">{p.nama_anak}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            cat?.badgeBg || 'bg-gray-100'
                          } ${cat?.badgeText || 'text-gray-700'} ${cat?.borderColor || 'border-gray-200'}`}
                        >
                          {p.jenis_lomba}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500">
                        {p.tingkat_sekolah} ({p.usia} th)
                      </td>
                      <td className="py-2 px-3 text-gray-700">{p.nama_pendamping}</td>
                      <td className="py-2 px-3 font-mono text-gray-600">{p.nomor_wa}</td>
                      <td className="py-2 px-3">
                        {p.wajib_dijemput ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Wajib Dijemput
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                            Mandiri
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Database Summary */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
          Status Database Terkini
        </h3>
        <p className="text-xs text-gray-600">
          Saat ini terdapat <strong>{existingPeserta.length} peserta</strong> tersimpan di sistem.
          Proses impor menggunakan mekanisme <em>upsert</em> cerdas berdasarkan <code>nomor_peserta</code> sehingga aman dari duplikasi.
        </p>
      </div>
    </div>
  );
};
