import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), '.supabase-config.json');

function cleanString(val?: string | null): string {
  if (!val) return '';
  let cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned.toLowerCase().startsWith('anon:')) {
    cleaned = cleaned.replace(/^anon:\s*/i, '').trim();
  }
  return cleaned;
}

function cleanUrl(val?: string | null): string {
  let cleaned = cleanString(val);
  if (!cleaned) return '';
  cleaned = cleaned.replace(/\/+$/, '');

  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  cleaned = cleaned.replace(/\/(rest|api)(\/v\d+)?\/?$/i, '');

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    if (cleaned.includes('.supabase.co')) {
      cleaned = `https://${cleaned}`;
    } else if (/^[a-z0-9_-]{15,30}$/i.test(cleaned)) {
      cleaned = `https://${cleaned}.supabase.co`;
    } else {
      cleaned = `https://${cleaned}`;
    }
  }

  return cleaned.replace(/\/+$/, '');
}

export async function GET() {
  try {
    // 1. Check file storage first
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      const url = cleanUrl(parsed.url);
      const anonKey = cleanString(parsed.anonKey);
      if (url && anonKey) {
        return NextResponse.json({ url, anonKey, configured: true, source: 'file' });
      }
    }

    // 2. Check environment variables
    const envUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const envKey = cleanString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (envUrl && envKey && !envUrl.includes('your-project')) {
      return NextResponse.json({ url: envUrl, anonKey: envKey, configured: true, source: 'env' });
    }

    return NextResponse.json({ url: '', anonKey: '', configured: false, source: 'none' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error reading config';
    return NextResponse.json({ error: message, configured: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = cleanUrl(body.url);
    const anonKey = cleanString(body.anonKey);

    if (!url || !anonKey) {
      // Remove file if resetting to empty
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        fs.unlinkSync(CONFIG_FILE_PATH);
      }
      return NextResponse.json({ success: true, cleared: true, configured: false });
    }

    const configData = { url, anonKey, updatedAt: new Date().toISOString() };
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2), 'utf-8');

    return NextResponse.json({ success: true, url, anonKey, configured: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error saving config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
