import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/keywords - List all keywords
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .order('weight', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/keywords - Add keyword
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('keywords')
    .insert({
      phrase: body.phrase?.toLowerCase().trim(),
      category: body.category || 'general',
      weight: body.weight || 1.0,
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/keywords?id=xxx - Delete keyword
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient();
  const id = request.nextUrl.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('keywords').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
