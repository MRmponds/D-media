import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/search - Trigger n8n webhook workflows
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Try reading webhook URLs from Supabase settings, fall back to env vars
    let settingsMap: Record<string, string> = {};
    try {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supaUrl && supaKey) {
        const { createServerClient } = await import('@/lib/supabase');
        const supabase = createServerClient();
        const { data: settings } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['n8n_webhook_find', 'n8n_webhook_scrape', 'n8n_webhook_analyze']);
        if (settings) {
          for (const s of settings) {
            settingsMap[s.key] = s.value;
          }
        }
      }
    } catch {
      // Supabase not available — that's fine, use env vars
    }

    const webhookUrls: Record<string, string> = {
      find: settingsMap['n8n_webhook_find'] || process.env.N8N_WEBHOOK_FIND || '',
      scrape: settingsMap['n8n_webhook_scrape'] || process.env.N8N_WEBHOOK_SCRAPE || '',
      analyze: settingsMap['n8n_webhook_analyze'] || process.env.N8N_WEBHOOK_ANALYZE || '',
    };

    const webhookUrl = webhookUrls[action];

    if (!webhookUrl) {
      // If no webhook URL configured, return mock data for testing
      return NextResponse.json({
        leads: getMockLeads(params),
        message: `No webhook URL configured for "${action}". Showing sample data. Add the URL in Settings or set N8N_WEBHOOK_${action.toUpperCase()} env var.`,
      });
    }

    // Call the n8n webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        industry: params?.industry || '',
        businessSize: params?.businessSize || 'any',
        location: params?.location || '',
        problemSignals: params?.problemSignals || [],
        customSignals: params?.customSignals || '',
        sources: params?.sources || ['reddit'],
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`n8n webhook returned ${webhookResponse.status}`);
    }

    const result = await webhookResponse.json();

    // n8n should return { leads: [...] }
    return NextResponse.json(result);
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mock data for when webhooks aren't configured yet
function getMockLeads(params: { industry?: string; location?: string } | null) {
  const industry = params?.industry || 'General Business';
  const location = params?.location || 'Global';

  return [
    {
      id: 'mock-1',
      company_name: `${industry} Solutions Ltd`,
      website: 'https://example.com',
      profile_url: null,
      industry: industry || 'General',
      location,
      detected_problem: 'no_leads',
      pain_summary: 'Company posted on Reddit asking for help getting more clients. They mentioned struggling with online visibility and declining foot traffic.',
      confidence_score: 87,
      urgency: 'high' as const,
      outreach_suggestion: `Hi! I noticed you mentioned struggling with client acquisition. At D-Media, we create high-converting motion graphics and ad creatives that help ${industry.toLowerCase()} businesses stand out. Would you be open to a quick chat?`,
      source: 'Reddit',
      source_url: 'https://reddit.com/r/smallbusiness',
      found_at: new Date().toISOString(),
      email: 'info@example-solutions.com',
      phone: '+260 97 1234567',
      company_website: 'https://example-solutions.com',
    },
    {
      id: 'mock-2',
      company_name: 'GrowthPath Marketing',
      website: 'https://example.com',
      profile_url: null,
      industry: industry || 'Marketing',
      location,
      detected_problem: 'bad_ads',
      pain_summary: 'Their current ad creatives are low quality stock photos with generic copy. Social media engagement is very low despite regular posting.',
      confidence_score: 72,
      urgency: 'medium' as const,
      outreach_suggestion: 'I took a look at your social media presence and noticed your creatives could use a professional upgrade. We specialize in motion graphics that boost engagement by 3-5x. Interested in seeing some examples?',
      source: 'Google',
      source_url: null,
      found_at: new Date().toISOString(),
      email: 'hello@growthpath.co',
      phone: null,
      company_website: 'https://growthpath.co',
    },
    {
      id: 'mock-3',
      company_name: 'QuickServe Restaurants',
      website: null,
      profile_url: null,
      industry: 'Restaurants & Food',
      location,
      detected_problem: 'no_marketing',
      pain_summary: 'No website found, minimal social media presence. Job posting mentions needing to "increase brand awareness" suggesting they know they need marketing help.',
      confidence_score: 65,
      urgency: 'medium' as const,
      outreach_suggestion: 'I noticed your restaurant doesn\'t have much of an online presence yet. We help food businesses create eye-catching video ads and social content that drives real foot traffic. Want to see what we did for similar restaurants?',
      source: 'Job Board',
      source_url: null,
      found_at: new Date().toISOString(),
      email: null,
      phone: '+260 96 7654321',
      company_website: null,
    },
  ];
}
