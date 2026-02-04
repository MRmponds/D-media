import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/leads - List leads with filters
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = request.nextUrl;

  let query = supabase.from('leads').select('*', { count: 'exact' });

  // Apply filters
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');
  const minScore = searchParams.get('minScore');
  const maxScore = searchParams.get('maxScore');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'discovered_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '25');

  if (platform) query = query.eq('platform', platform);
  if (status) query = query.eq('status', status);
  if (minScore) query = query.gte('lead_score', parseInt(minScore));
  if (maxScore) query = query.lte('lead_score', parseInt(maxScore));
  if (search) {
    query = query.or(
      `post_content.ilike.%${search}%,username.ilike.%${search}%,detected_problem.ilike.%${search}%`
    );
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}

// POST /api/leads - Create a lead (used by n8n webhook)
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const body = await request.json();

  // Accept single lead or array of leads
  const leads = Array.isArray(body) ? body : [body];

  const results = [];
  for (const lead of leads) {
    const { data, error } = await supabase
      .from('leads')
      .upsert(lead, { onConflict: 'content_hash' })
      .select()
      .single();

    results.push({ data, error: error?.message });
  }

  return NextResponse.json({ results });
}

// PATCH /api/leads - Update lead status (batch)
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { ids, updates } = body;

  if (!ids || !Array.isArray(ids) || !updates) {
    return NextResponse.json({ error: 'ids (array) and updates required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .in('id', ids)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
