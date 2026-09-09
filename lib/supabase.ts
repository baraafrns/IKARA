import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PesertaLomba, StatusKehadiran } from '@/types/peserta';
import { INITIAL_SAMPLE_PESERTA } from './sample-data';

const STORAGE_KEY = 'ikara_peserta_data_v1';
const SUPABASE_CONFIG_KEY = 'ikara_supabase_custom_config_v1';

let cachedClient: SupabaseClient | null = null;
let cachedConfigString = '';
let inMemoryRemoteConfig: SupabaseConfig | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function cleanString(val?: string | null): string {
  if (!val) return '';
  let cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned.toLowerCase().startsWith('anon:')) {
    cleaned = cleaned.replace(/^anon:\s*/i, '').trim();
  }
  return cleaned;
}

export function cleanUrl(val?: string | null): string {
  let cleaned = cleanString(val);
  if (!cleaned) return '';

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Case 1: User pasted browser dashboard URL from address bar, e.g.
  // https://supabase.com/dashboard/project/abcdefghijklmnop.../settings/api
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Case 2: User appended /rest/v1 or /rest or /api to the Project URL
  cleaned = cleaned.replace(/\/(rest|api)(\/v\d+)?\/?$/i, '');

  // Case 3: Missing protocol or user only supplied project ref
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    if (cleaned.includes('.supabase.co')) {
      cleaned = `https://${cleaned}`;
    } else if (/^[a-z0-9_-]{15,30}$/i.test(cleaned)) {
      // Just the project ref ID
      cleaned = `https://${cleaned}.supabase.co`;
    } else {
      cleaned = `https://${cleaned}`;
    }
  }

  return cleaned.replace(/\/+$/, '');
}

export function getActiveSupabaseConfig(): SupabaseConfig | null {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        const url = cleanUrl(parsed.url);
        const anonKey = cleanString(parsed.anonKey);
        if (url && anonKey) {
          return { url, anonKey };
        }
      } catch {
        // ignore parse error
      }
    }
  }

  if (inMemoryRemoteConfig && inMemoryRemoteConfig.url && inMemoryRemoteConfig.anonKey) {
    return inMemoryRemoteConfig;
  }

  const envUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const envKey = cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getActiveSupabaseConfig() !== null;
}

export async function syncRemoteConfig(): Promise<SupabaseConfig | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const data = await res.json();
      if (data.configured && data.url && data.anonKey) {
        const cleaned: SupabaseConfig = {
          url: cleanUrl(data.url),
          anonKey: cleanString(data.anonKey),
        };
        inMemoryRemoteConfig = cleaned;

        // Save to localStorage as well so it is cached immediately
        const local = localStorage.getItem(SUPABASE_CONFIG_KEY);
        if (!local) {
          localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(cleaned));
        }
        cachedClient = null;
        cachedConfigString = '';
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('Could not sync remote Supabase config:', err);
  }

  return getActiveSupabaseConfig();
}

export async function saveCustomSupabaseConfig(config: SupabaseConfig | null) {
  if (typeof window === 'undefined') return;

  if (!config) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
    inMemoryRemoteConfig = null;
    try {
      await fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '', anonKey: '' }),
      });
    } catch {
      // ignore
    }
  } else {
    const cleaned = {
      url: cleanUrl(config.url),
      anonKey: cleanString(config.anonKey),
    };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(cleaned));
    inMemoryRemoteConfig = cleaned;

    try {
      await fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });
    } catch {
      // ignore
    }
  }
  cachedClient = null;
  cachedConfigString = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getActiveSupabaseConfig();
  if (!config) return null;

  const configKey = `${config.url}:::${config.anonKey}`;
  if (cachedClient && cachedConfigString === configKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    cachedConfigString = configKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// Fallback Local Storage Data Management
export function getLocalPeserta(): PesertaLomba[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPeserta(data: PesertaLomba[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving local peserta:', e);
  }
}

// Unified Service API - Prioritizes live Supabase API over local defaults
export async function fetchAllPeserta(): Promise<{ data: PesertaLomba[]; source: 'supabase' | 'local'; error?: string }> {
  // First ensure remote config is synced if not yet in memory or localStorage
  if (!isSupabaseConfigured() && typeof window !== 'undefined') {
    await syncRemoteConfig();
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('peserta_lomba')
        .select('*')
        .order('nomor_peserta', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        // Do NOT fallback to dummy local participants; retain source as supabase so user knows real status
        return { data: getLocalPeserta(), source: 'supabase', error: error.message };
      }

      const rows = (data || []) as PesertaLomba[];
      // Sync to local storage as offline cache
      saveLocalPeserta(rows);
      return { data: rows, source: 'supabase' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown network error';
      return { data: getLocalPeserta(), source: 'supabase', error: msg };
    }
  }

  return { data: getLocalPeserta(), source: 'local' };
}

export async function updatePesertaStatus(
  id: string,
  newStatus: StatusKehadiran,
  timestampIso?: string
): Promise<{ success: boolean; updated?: PesertaLomba; error?: string }> {
  const now = timestampIso || new Date().toISOString();
  const updatePayload: Partial<PesertaLomba> = {
    status_kehadiran: newStatus,
  };

  if (newStatus === 'SUDAH_HADIR') {
    updatePayload.waktu_daftar_ulang = now;
  } else if (newStatus === 'SUDAH_PULANG') {
    updatePayload.waktu_pulang = now;
  } else if (newStatus === 'BELUM_HADIR') {
    updatePayload.waktu_daftar_ulang = null;
    updatePayload.waktu_pulang = null;
  }

  const client = getSupabaseClient();
  let updatedItem: PesertaLomba | undefined;

  // Always update local storage first for instant optimistic response
  const localList = getLocalPeserta();
  const index = localList.findIndex((p) => p.id === id);
  if (index !== -1) {
    localList[index] = { ...localList[index], ...updatePayload };
    updatedItem = localList[index];
    saveLocalPeserta(localList);
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('peserta_lomba')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message, updated: updatedItem };
      }
      return { success: true, updated: data as PesertaLomba };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update remote';
      return { success: false, error: msg, updated: updatedItem };
    }
  }

  return { success: true, updated: updatedItem };
}

export async function upsertPesertaList(
  newList: PesertaLomba[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (newList.length === 0) return { success: true, count: 0 };

  // Update local storage
  const current = getLocalPeserta();
  const currentMap = new Map<string, PesertaLomba>();
  current.forEach((p) => currentMap.set(p.nomor_peserta, p));

  newList.forEach((p) => {
    const existing = currentMap.get(p.nomor_peserta);
    if (existing) {
      currentMap.set(p.nomor_peserta, {
        ...existing,
        ...p,
        // preserve status if existing had progress
        status_kehadiran: existing.status_kehadiran !== 'BELUM_HADIR' ? existing.status_kehadiran : p.status_kehadiran,
        waktu_daftar_ulang: existing.waktu_daftar_ulang || p.waktu_daftar_ulang,
        waktu_pulang: existing.waktu_pulang || p.waktu_pulang,
      });
    } else {
      currentMap.set(p.nomor_peserta, p);
    }
  });

  const merged = Array.from(currentMap.values());
  saveLocalPeserta(merged);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('peserta_lomba')
        .upsert(newList, { onConflict: 'nomor_peserta' });

      if (error) {
        return { success: false, count: newList.length, error: error.message };
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to sync with Supabase';
      return { success: false, count: newList.length, error: msg };
    }
  }

  return { success: true, count: newList.length };
}

export async function addNewPeserta(peserta: PesertaLomba): Promise<{ success: boolean; data?: PesertaLomba; error?: string }> {
  const current = getLocalPeserta();
  const updated = [peserta, ...current];
  saveLocalPeserta(updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('peserta_lomba')
        .insert([peserta])
        .select()
        .single();
      if (error) {
        return { success: false, error: error.message, data: peserta };
      }
      return { success: true, data: data as PesertaLomba };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to insert to Supabase';
      return { success: false, error: msg, data: peserta };
    }
  }

  return { success: true, data: peserta };
}

export async function resetAllDataToSample(): Promise<PesertaLomba[]> {
  saveLocalPeserta(INITIAL_SAMPLE_PESERTA);
  const client = getSupabaseClient();
  if (client) {
    try {
      // Clear and reseed
      await client.from('peserta_lomba').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('peserta_lomba').upsert(INITIAL_SAMPLE_PESERTA, { onConflict: 'nomor_peserta' });
    } catch (e) {
      console.error('Failed to reset remote Supabase:', e);
    }
  }
  return INITIAL_SAMPLE_PESERTA;
}
