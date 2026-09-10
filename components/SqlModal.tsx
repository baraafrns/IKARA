'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Database, ExternalLink, RefreshCw, Key, Globe, AlertTriangle } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '@/lib/sql-schema';
import { getActiveSupabaseConfig, saveCustomSupabaseConfig, getSupabaseClient, cleanUrl, cleanString } from '@/lib/supabase';

interface SqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  onResetData: () => void;
}

export const SqlModal: React.FC<SqlModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  onResetData,
}) => {
  const currentConfig = getActiveSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(currentConfig?.anonKey || '');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);

    const cleanedUrl = cleanUrl(supabaseUrl);
    const cleanedKey = cleanString(supabaseKey);

    if (!cleanedUrl && !cleanedKey) {
      await saveCustomSupabaseConfig(null);
      setTestResult({ success: true, message: 'Kembali ke mode Local Storage (Browser Cache).' });
      setIsSaving(false);
      onConfigUpdated();
      return;
    }

    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      setTestResult({ success: false, message: 'URL Supabase harus diawali dengan https://' });
      setIsSaving(false);
      return;
    }

    // Auto update state if cleaned values differed
    if (cleanedUrl !== supabaseUrl) {
      setSupabaseUrl(cleanedUrl);
    }
    if (cleanedKey !== supabaseKey) {
      setSupabaseKey(cleanedKey);
    }

    await saveCustomSupabaseConfig({ url: cleanedUrl, anonKey: cleanedKey });

    // Test connection
    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Gagal menginisialisasi klien Supabase');
      }
      const { error } = await client.from('peserta_lomba').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          setTestResult({
            success: true,
            message: 'Terhubung ke Supabase! Tabel "peserta_lomba" belum dibuat. Harap jalankan Skrip SQL di bawah pada SQL Editor Supabase Anda.',
          });
          onConfigUpdated();
        } else if (error.message.includes('Invalid path specified in request URL') || error.message.includes('Invalid path')) {
          setTestResult({
            success: false,
            message: 'URL Supabase salah: Jangan gunakan URL browser dashboard (supabase.com/dashboard/...). Gunakan Project URL dari Project Settings > API dengan format: https://[id-proyek].supabase.co',
          });
        } else if (error.message.includes('Invalid API key')) {
          setTestResult({
            success: false,
            message: 'Kunci API salah: Pastikan menyalin key "anon public" (diawali eyJ...) tanpa tanda kutip.',
          });
        } else if (error.message.includes('permission denied')) {
          setTestResult({
            success: false,
            message: 'Akses Ditolak (Permission Denied): Role anon belum memiliki izin ke tabel. Jalankan baris GRANT SQL di bawah pada SQL Editor Supabase Anda.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Supabase Error: ${error.message}`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Koneksi Berhasil! Terhubung secara realtime ke tabel "peserta_lomba" Supabase.',
        });
        onConfigUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi gagal';
      setTestResult({ success: false, message: `Koneksi gagal: ${msg}` });
    }

    setIsSaving(false);
    onConfigUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Supabase & Database Setup</h2>
              <p className="text-xs text-gray-500">Konfigurasi database cloud & skrip skema PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-6 text-sm text-gray-700">
          {/* Status Alert */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <div className="text-xs leading-relaxed text-teal-900">
              <strong className="font-semibold">Mode Operasional Fleksibel:</strong> Aplikasi ini dirancang siap pakai (Zero Setup) dengan cache lokal otomatis, dan langsung mendukung sinkronisasi real-time cloud jika Anda memasukkan konfigurasi Supabase Anda di bawah.
            </div>
          </div>

          {/* Form Credentials */}
          <form onSubmit={handleSaveConfig} className="space-y-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              Koneksi Supabase
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project URL Supabase
              </label>
              <input
                type="text"
                placeholder="https://xyzprojectid.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Anon Public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                ⚠️ Gunakan key <strong>anon public</strong> dari menu <em>Project Settings &gt; API</em> di Supabase (biasanya diawali dengan <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono">eyJ...</code>). <strong>Jangan sertakan tanda kutip</strong>.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setSupabaseUrl('');
                  setSupabaseKey('');
                  saveCustomSupabaseConfig(null);
                  setTestResult({ success: true, message: 'Kembali ke mode Local Storage.' });
                  onConfigUpdated();
                }}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Gunakan Local Cache
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Simpan & Tes Koneksi
              </button>
            </div>
          </form>

          {/* SQL Schema Script Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Skrip SQL Setup Tabel `peserta_lomba`
                </h3>
                <p className="text-[11px] text-gray-500">
                  Salin dan jalankan skrip ini di SQL Editor dashboard Supabase Anda.
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors border border-teal-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin SQL'}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950 p-3.5 font-mono text-[11px] text-teal-300 max-h-56 overflow-y-auto leading-relaxed">
              <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>

          {/* Quick Demo Reset Section */}
          <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-gray-800">Hapus semua data</h4>
              <p className="text-[11px] text-gray-500">
                Hapus seluruh data peserta IKARA Festival.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Muat ulang data simulasi awal? Perubahan status yang ada akan direset ke status sampel.')) {
                  onResetData();
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg shrink-0 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
