export type StatusKehadiran = 'BELUM_HADIR' | 'SUDAH_HADIR' | 'SUDAH_PULANG';

export interface PesertaLomba {
  id: string;
  nomor_peserta: string;
  nama_anak: string;
  usia: number;
  tingkat_sekolah: string;
  jenis_lomba: string;
  nama_pendamping: string;
  nomor_wa: string;
  wajib_dijemput: boolean;
  status_kehadiran: StatusKehadiran;
  waktu_daftar_ulang: string | null;
  waktu_pulang: string | null;
  created_at?: string;
}

export type CategoryPrefix = 'MW' | 'MG' | 'AZ' | 'HQ' | 'CCSD' | 'CCSMP';

export interface CompetitionCategory {
  id: string;
  name: string;
  prefix: CategoryPrefix;
  targetClass: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const COMPETITION_CATEGORIES: CompetitionCategory[] = [
  {
    id: 'mewarnai',
    name: 'Lomba Mewarnai (TK / PAUD)',
    prefix: 'MW',
    targetClass: 'TK / PAUD',
    color: '#FB923C', // Secondary Orange
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  {
    id: 'menggambar',
    name: 'Lomba Menggambar (Kelas 1-3 SD)',
    prefix: 'MG',
    targetClass: 'Kelas 1-3 SD',
    color: '#0D9488', // Primary Teal
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
  },
  {
    id: 'adzan',
    name: 'Lomba Adzan (Kelas 4-6 SD)',
    prefix: 'AZ',
    targetClass: 'Kelas 4-6 SD',
    color: '#2563EB', // Info Blue
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    id: 'tahfidz',
    name: "Lomba Menghafal Qur'an (Kelas 4-6 SD)",
    prefix: 'HQ',
    targetClass: 'Kelas 4-6 SD',
    color: '#059669', // Success Emerald
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'cerdas_cermat_sd',
    name: 'Lomba Cerdas Cermat SD (Kelas 4-6 SD)',
    prefix: 'CCSD',
    targetClass: 'Kelas 4-6 SD',
    color: '#A855F7', // Tertiary Purple
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  {
    id: 'cerdas_cermat_smp',
    name: 'Lomba Cerdas Cermat SMP (Kelas 7-9 SMP)',
    prefix: 'CCSMP',
    targetClass: 'Kelas 7-9 SMP',
    color: '#EC4899', // Pink
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    borderColor: 'border-pink-200',
  },
];

export function getCategoryByPrefix(prefix: string): CompetitionCategory | undefined {
  return COMPETITION_CATEGORIES.find((c) => c.prefix === prefix);
}

export function detectCategoryFromName(input: string): CompetitionCategory {
  const text = (input || '').toLowerCase();
  if (text.includes('mewarnai') || text.includes('mw') || text.includes('paud') || text.includes('tk')) {
    return COMPETITION_CATEGORIES[0]; // MW
  }
  if (text.includes('menggambar') || text.includes('mg') || text.includes('gambar') || text.includes('1-3')) {
    return COMPETITION_CATEGORIES[1]; // MG
  }
  if (text.includes('adzan') || text.includes('azan') || text.includes('az')) {
    return COMPETITION_CATEGORIES[2]; // AZ
  }
  if (text.includes('hafal') || text.includes('qur') || text.includes('hq') || text.includes('tahfidz')) {
    return COMPETITION_CATEGORIES[3]; // HQ
  }
  if (text.includes('cerdas cermat') || text.includes('cc')) {
    if (text.includes('smp') || text.includes('7-9') || text.includes('ccsmp')) {
      return COMPETITION_CATEGORIES[5]; // CCSMP
    }
    return COMPETITION_CATEGORIES[4]; // CCSD
  }
  // Default to first if unrecognized
  return COMPETITION_CATEGORIES[0];
}
