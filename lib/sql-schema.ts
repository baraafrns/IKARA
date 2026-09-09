export const SUPABASE_SQL_SCHEMA = `-- IKARA COMPETITION DATA CENTER - Database Setup Script
-- Paste this script into your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- 1. Create Enum Status Kehadiran
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_status_kehadiran') THEN
    CREATE TYPE enum_status_kehadiran AS ENUM ('BELUM_HADIR', 'SUDAH_HADIR', 'SUDAH_PULANG');
  END IF;
END$$;

-- 2. Create peserta_lomba Table
CREATE TABLE IF NOT EXISTS peserta_lomba (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_peserta VARCHAR(20) UNIQUE NOT NULL,
  nama_anak VARCHAR(255) NOT NULL,
  usia INT NOT NULL DEFAULT 8,
  tingkat_sekolah VARCHAR(50) NOT NULL DEFAULT 'SD',
  jenis_lomba VARCHAR(100) NOT NULL,
  nama_pendamping VARCHAR(255) NOT NULL,
  nomor_wa VARCHAR(50) NOT NULL,
  wajib_dijemput BOOLEAN DEFAULT TRUE,
  status_kehadiran enum_status_kehadiran DEFAULT 'BELUM_HADIR',
  waktu_daftar_ulang TIMESTAMPTZ,
  waktu_pulang TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for high-performance mobile search
CREATE INDEX IF NOT EXISTS idx_peserta_nomor ON peserta_lomba (nomor_peserta);
CREATE INDEX IF NOT EXISTS idx_peserta_nama ON peserta_lomba (nama_anak);
CREATE INDEX IF NOT EXISTS idx_peserta_status ON peserta_lomba (status_kehadiran);
CREATE INDEX IF NOT EXISTS idx_peserta_jenis ON peserta_lomba (jenis_lomba);

-- 4. Berikan Hak Akses Tabel ke role anon dan authenticated (Wajib di PostgreSQL/Supabase)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE peserta_lomba TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Enable Row Level Security (RLS) & Public Policies for Event Operations
ALTER TABLE peserta_lomba ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON peserta_lomba;
CREATE POLICY "Allow public read access" ON peserta_lomba FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON peserta_lomba;
CREATE POLICY "Allow public insert access" ON peserta_lomba FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON peserta_lomba;
CREATE POLICY "Allow public update access" ON peserta_lomba FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public delete access" ON peserta_lomba;
CREATE POLICY "Allow public delete access" ON peserta_lomba FOR DELETE TO anon, authenticated USING (true);

-- 6. Enable Realtime Replication (Aman jika dijalankan berulang)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'peserta_lomba'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE peserta_lomba;
  END IF;
END$$;
`;
