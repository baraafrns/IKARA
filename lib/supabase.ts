import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PesertaLomba, StatusKehadiran } from '@/types/peserta';
import { INITIAL_SAMPLE_PESERTA } from './sample-data';

const STORAGE_KEY = 'ikara_peserta_data_v1';
const SUPABASE_CONFIG_KEY = 'ikara_supabase_custom_config_v1';

let cachedClient: SupabaseClient | null = null;
let cachedConfigString = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getActiveSupabaseConfig(): SupabaseConfig | null {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url, anonKey: parsed.anonKey };
        }
      } catch {
        // ignore parse error
      }
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

export function saveCustomSupabaseConfig(config: SupabaseConfig | null) {
  if (typeof window === 'undefined') return;
  if (!config) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
  } else {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
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
  if (typeof window === 'undefined') return INITIAL_SAMPLE_PESERTA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_PESERTA));
      return INITIAL_SAMPLE_PESERTA;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SAMPLE_PESERTA;
  } catch {
    return INITIAL_SAMPLE_PESERTA;
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

// Unified Service API
export async function fetchAllPeserta(): Promise<{ data: PesertaLomba[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('peserta_lomba')
        .select('*')
        .order('nomor_peserta', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error, fallback to local:', error.message);
        return { data: getLocalPeserta(), source: 'local', error: error.message };
      }
      if (data && data.length > 0) {
        // Cache to local as backup
        saveLocalPeserta(data as PesertaLomba[]);
        return { data: data as PesertaLomba[], source: 'supabase' };
      }
      // If Supabase table is empty, return local or empty
      const local = getLocalPeserta();
      return { data: local, source: 'supabase' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown network error';
      return { data: getLocalPeserta(), source: 'local', error: msg };
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
