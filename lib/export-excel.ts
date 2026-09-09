import * as XLSX from 'xlsx';
import { PesertaLomba, COMPETITION_CATEGORIES } from '@/types/peserta';

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function calculateDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso) return '-';
  try {
    const start = new Date(startIso).getTime();
    const end = endIso ? new Date(endIso).getTime() : Date.now();
    const diffMins = Math.round((end - start) / (1000 * 60));
    if (diffMins < 0) return '0 menit';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0) {
      return `${hours} jam ${mins} mnt`;
    }
    return `${mins} menit`;
  } catch {
    return '-';
  }
}

export function exportPesertaToExcel(
  pesertaList: PesertaLomba[],
  filename: string = 'IKARA_Data_Peserta_Lomba'
): void {
  // 1. Prepare Main Data Rows
  const mainRows = pesertaList.map((p, idx) => {
    let statusLabel = 'Belum Hadir';
    if (p.status_kehadiran === 'SUDAH_HADIR') statusLabel = 'Sudah Hadir (Di Lokasi)';
    else if (p.status_kehadiran === 'SUDAH_PULANG') statusLabel = 'Sudah Pulang / Selesai';

    return {
      'No.': idx + 1,
      'Nomor Peserta': p.nomor_peserta,
      'Nama Lengkap Anak': p.nama_anak,
      'Usia': p.usia,
      'Tingkat Sekolah': p.tingkat_sekolah,
      'Jenis Lomba': p.jenis_lomba,
      'Nama Pendamping': p.nama_pendamping,
      'No. WhatsApp': p.nomor_wa,
      'Ket. Penjemputan': p.wajib_dijemput ? 'Wajib Dijemput Pendamping' : 'Pulang Sendiri / Mandiri',
      'Status Kehadiran': statusLabel,
      'Waktu Registrasi Ulang': formatDateTime(p.waktu_daftar_ulang),
      'Waktu Kepulangan': formatDateTime(p.waktu_pulang),
      'Durasi di Lokasi': calculateDuration(p.waktu_daftar_ulang, p.waktu_pulang),
    };
  });

  // 2. Prepare Statistics Summary Sheet
  interface SummaryRowItem {
    'Kategori Lomba': string;
    'Prefix': string;
    'Target Peserta': string;
    'Total Peserta': number;
    'Belum Hadir': number;
    'Di Lokasi': number;
    'Sudah Pulang': number;
    'Persentase Hadir': string;
  }

  const summaryRows: SummaryRowItem[] = COMPETITION_CATEGORIES.map((cat) => {
    const items = pesertaList.filter((p) => p.jenis_lomba.includes(cat.name) || p.nomor_peserta.startsWith(cat.prefix));
    const total = items.length;
    const belum = items.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
    const hadir = items.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;
    const pulang = items.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length;
    const percent = total > 0 ? Math.round(((hadir + pulang) / total) * 100) : 0;

    return {
      'Kategori Lomba': cat.name,
      'Prefix': cat.prefix,
      'Target Peserta': cat.targetClass,
      'Total Peserta': total,
      'Belum Hadir': belum,
      'Di Lokasi': hadir,
      'Sudah Pulang': pulang,
      'Persentase Hadir': `${percent}%`,
    };
  });

  // Total Row
  const totalPeserta = pesertaList.length;
  const totalBelum = pesertaList.filter((p) => p.status_kehadiran === 'BELUM_HADIR').length;
  const totalHadir = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_HADIR').length;
  const totalPulang = pesertaList.filter((p) => p.status_kehadiran === 'SUDAH_PULANG').length;
  const totalPercent = totalPeserta > 0 ? Math.round(((totalHadir + totalPulang) / totalPeserta) * 100) : 0;

  summaryRows.push({
    'Kategori Lomba': 'TOTAL KESELURUHAN',
    'Prefix': '-',
    'Target Peserta': '-',
    'Total Peserta': totalPeserta,
    'Belum Hadir': totalBelum,
    'Di Lokasi': totalHadir,
    'Sudah Pulang': totalPulang,
    'Persentase Hadir': `${totalPercent}%`,
  });

  // 3. Create Workbook
  const workbook = XLSX.utils.book_new();

  const mainSheet = XLSX.utils.json_to_sheet(mainRows);
  // Set column widths
  mainSheet['!cols'] = [
    { wch: 5 },  // No.
    { wch: 14 }, // Nomor Peserta
    { wch: 28 }, // Nama Anak
    { wch: 6 },  // Usia
    { wch: 16 }, // Tingkat Sekolah
    { wch: 32 }, // Jenis Lomba
    { wch: 24 }, // Nama Pendamping
    { wch: 16 }, // No WA
    { wch: 25 }, // Status Penjemputan
    { wch: 24 }, // Status Kehadiran
    { wch: 22 }, // Waktu Daftar Ulang
    { wch: 22 }, // Waktu Pulang
    { wch: 16 }, // Durasi
  ];
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Data Peserta Lomba');

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 35 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Statistik');

  // 4. Trigger Download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}
