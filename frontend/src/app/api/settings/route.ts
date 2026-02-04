import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/settings - Get all settings
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('settings').select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, unknown> = {};
  data?.forEach((s) => { settings[s.key] = s.value; });
  return NextResponse.json(settings);
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { key, value } = body;

  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: JSON.parse(JSON.stringify(value)) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
