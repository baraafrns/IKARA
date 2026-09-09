import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PesertaLomba, detectCategoryFromName, COMPETITION_CATEGORIES } from '@/types/peserta';

export interface ParseResult {
  peserta: PesertaLomba[];
  errors: string[];
  totalRows: number;
}

// Find existing max index per category prefix to ensure continuity
export function getNextSequencePerCategory(existingList: PesertaLomba[]): Record<string, number> {
  const counts: Record<string, number> = {
    MW: 0,
    MG: 0,
    AZ: 0,
    HQ: 0,
    CCSD: 0,
    CCSMP: 0,
  };

  existingList.forEach((item) => {
    const parts = (item.nomor_peserta || '').split('-');
    if (parts.length === 2) {
      const prefix = parts[0];
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && counts[prefix] !== undefined) {
        if (num > counts[prefix]) {
          counts[prefix] = num;
        }
      }
    }
  });

  return counts;
}

// Normalize row keys for flexible CSV/XLSX header matching
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseRawRecords(
  rows: Record<string, any>[],
  existingPeserta: PesertaLomba[] = []
): ParseResult {
  const errors: string[] = [];
  const parsedPeserta: PesertaLomba[] = [];

  const sequenceCounters = getNextSequencePerCategory(existingPeserta);

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 1-based, +1 for header

    // Map keys to normalized form
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalizedRow[normalizeKey(k)] = row[k];
    });

    // 1. Nama Anak
    let namaAnak =
      normalizedRow['namalengkapanak'] ||
      normalizedRow['namaanak'] ||
      normalizedRow['nama'] ||
      normalizedRow['namapeserta'] ||
      normalizedRow['namalengkap'] ||
      normalizedRow['namasiswi'] ||
      normalizedRow['namasiswa'] ||
      normalizedRow['namalengkappeserta'] ||
      normalizedRow['fullname'] ||
      normalizedRow['name'] ||
      '';

    // Heuristic: if not matched, look for any key containing 'nama' or 'name' or 'peserta'
    if (!namaAnak) {
      const nameKey = Object.keys(normalizedRow).find(
        (k) => (k.includes('nama') || k.includes('name') || k.includes('peserta') || k.includes('anak')) && !k.includes('orangtua') && !k.includes('wali') && !k.includes('pendamping')
      );
      if (nameKey) {
        namaAnak = normalizedRow[nameKey];
      }
    }

    if (!namaAnak || String(namaAnak).trim() === '') {
      // Skip empty blank lines
      return;
    }

    // 2. Jenis Lomba
    let jenisLombaRaw =
      normalizedRow['lombayangdiminatipilihsesuaikelas'] ||
      normalizedRow['lombayangdiminati'] ||
      normalizedRow['jenislomba'] ||
      normalizedRow['lomba'] ||
      normalizedRow['kategori'] ||
      normalizedRow['kategorilomba'] ||
      normalizedRow['pilihanlomba'] ||
      normalizedRow['competition'] ||
      normalizedRow['category'] ||
      '';

    if (!jenisLombaRaw) {
      const lombaKey = Object.keys(normalizedRow).find(
        (k) => k.includes('lomba') || k.includes('kategori') || k.includes('competition')
      );
      if (lombaKey) {
        jenisLombaRaw = normalizedRow[lombaKey];
      }
    }

    const detectedCategory = detectCategoryFromName(String(jenisLombaRaw));

    // 3. Nama Pendamping
    let namaPendamping =
      normalizedRow['namaorangtuawali'] ||
      normalizedRow['namapendamping'] ||
      normalizedRow['orangtuawali'] ||
      normalizedRow['wali'] ||
      normalizedRow['namaorangtua'] ||
      normalizedRow['orangtua'] ||
      normalizedRow['parent'] ||
      normalizedRow['guardian'] ||
      '';

    if (!namaPendamping) {
      const parentKey = Object.keys(normalizedRow).find(
        (k) => k.includes('orangtua') || k.includes('wali') || k.includes('pendamping') || k.includes('parent') || k.includes('ibu') || k.includes('ayah')
      );
      if (parentKey) {
        namaPendamping = normalizedRow[parentKey];
      }
    }
    if (!namaPendamping) {
      namaPendamping = 'Orang Tua / Wali';
    }

    // 4. Nomor WA
    let nomorWa =
      normalizedRow['nowhatsapporangtuawali'] ||
      normalizedRow['nowaorangtua'] ||
      normalizedRow['nowa'] ||
      normalizedRow['nomorwa'] ||
      normalizedRow['nowhatsapp'] ||
      normalizedRow['nomorwhatsapp'] ||
      normalizedRow['nohp'] ||
      normalizedRow['hp'] ||
      normalizedRow['telepon'] ||
      normalizedRow['whatsapp'] ||
      normalizedRow['phone'] ||
      normalizedRow['phonenumber'] ||
      '-';

    if (nomorWa === '-') {
      const phoneKey = Object.keys(normalizedRow).find(
        (k) => k.includes('wa') || k.includes('whatsapp') || k.includes('telepon') || k.includes('hp') || k.includes('phone') || k.includes('kontak')
      );
      if (phoneKey) {
        nomorWa = normalizedRow[phoneKey] || '-';
      }
    }

    nomorWa = String(nomorWa).trim();
    // Normalize Indonesian phone numbers if starts with 08 or 62
    if (nomorWa.startsWith("'08")) {
      nomorWa = nomorWa.substring(1);
    }

    // 5. Wajib Dijemput / Status Penjemputan
    const didampingiRaw = String(
      normalizedRow['didampingiatausendiri'] ||
      normalizedRow['statuspenjemputan'] ||
      normalizedRow['wajibdijemput'] ||
      normalizedRow['penjemputan'] ||
      'didampingi'
    ).toLowerCase();

    // Default to true unless explicitly "sendiri" / "mandiri" / false
    const wajibDijemput = !(
      didampingiRaw.includes('sendiri') ||
      didampingiRaw.includes('mandiri') ||
      didampingiRaw === 'false' ||
      didampingiRaw === 'tidak'
    );

    // 6. Usia & Tingkat Sekolah
    let usia = parseInt(
      normalizedRow['usia'] ||
      normalizedRow['umur'] ||
      '',
      10
    );

    let tingkatSekolah = String(
      normalizedRow['tingkatsekolah'] ||
      normalizedRow['sekolah'] ||
      normalizedRow['kelas'] ||
      ''
    ).trim();

    // If not provided in Google Form, assign sensible default based on category
    if (isNaN(usia) || usia <= 0) {
      if (detectedCategory.prefix === 'MW') usia = 5;
      else if (detectedCategory.prefix === 'MG') usia = 8;
      else if (detectedCategory.prefix === 'AZ' || detectedCategory.prefix === 'HQ' || detectedCategory.prefix === 'CCSD') usia = 11;
      else if (detectedCategory.prefix === 'CCSMP') usia = 14;
      else usia = 9;
    }

    if (!tingkatSekolah) {
      tingkatSekolah = detectedCategory.targetClass;
    }

    // 7. Nomor Peserta
    let nomorPeserta = String(
      normalizedRow['nomorpeserta'] ||
      normalizedRow['nopeserta'] ||
      ''
    ).trim().toUpperCase();

    if (!nomorPeserta || !nomorPeserta.includes('-')) {
      sequenceCounters[detectedCategory.prefix] = (sequenceCounters[detectedCategory.prefix] || 0) + 1;
      const numStr = String(sequenceCounters[detectedCategory.prefix]).padStart(3, '0');
      nomorPeserta = `${detectedCategory.prefix}-${numStr}`;
    }

    // Generate UUID if not given
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    parsedPeserta.push({
      id,
      nomor_peserta: nomorPeserta,
      nama_anak: String(namaAnak).trim(),
      usia,
      tingkat_sekolah: tingkatSekolah,
      jenis_lomba: detectedCategory.name,
      nama_pendamping: String(namaPendamping).trim(),
      nomor_wa: nomorWa,
      wajib_dijemput: wajibDijemput,
      status_kehadiran: 'BELUM_HADIR',
      waktu_daftar_ulang: null,
      waktu_pulang: null,
      created_at: new Date().toISOString(),
    });
  });

  return {
    peserta: parsedPeserta,
    errors,
    totalRows: parsedPeserta.length,
  };
}

export function parseCSVString(csvText: string, existingPeserta: PesertaLomba[] = []): ParseResult {
  const cleanCsv = csvText.replace(/^\uFEFF/, '').trim();
  const result = Papa.parse(cleanCsv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().replace(/^["']|["']$/g, ''),
  });

  if (result.errors && result.errors.length > 0) {
    const errMessages = result.errors.map((e) => `Baris ${e.row}: ${e.message}`);
    const parsed = parseRawRecords(result.data as Record<string, any>[], existingPeserta);
    return {
      ...parsed,
      errors: [...errMessages, ...parsed.errors],
    };
  }

  return parseRawRecords(result.data as Record<string, any>[], existingPeserta);
}

export function parseExcelArrayBuffer(buffer: ArrayBuffer, existingPeserta: PesertaLomba[] = []): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];
    return parseRawRecords(jsonData, existingPeserta);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal membaca format Excel';
    return {
      peserta: [],
      errors: [msg],
      totalRows: 0,
    };
  }
}

export async function fetchGoogleSheetsPublishedCSV(sheetUrl: string, existingPeserta: PesertaLomba[] = []): Promise<ParseResult> {
  // Convert standard Google Docs edit link into published csv export link if needed
  let fetchUrl = sheetUrl.trim();
  if (fetchUrl.includes('docs.google.com/spreadsheets') && !fetchUrl.includes('output=csv')) {
    const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengunduh Google Sheet (${response.status}: ${response.statusText}). Pastikan tautan telah di-publish ke Web.`);
  }

  const csvText = await response.text();
  return parseCSVString(csvText, existingPeserta);
}
