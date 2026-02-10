import { NextRequest, NextResponse } from 'next/server';
import {
  scrapeReddit,
  scrapeApollo,
  scrapeFiverr,
  scrapeGoZambiaJobs,
  scrapeGoogle,
  RawLead,
} from '@/lib/scrapers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for scraping

interface SearchParams {
  industry?: string;
  businessSize?: string;
  location?: string;
  problemSignals?: string[];
  customSignals?: string;
  sources?: string[];
}

// Build search keywords from user params
function buildKeywords(params: SearchParams): string {
  const signalMap: Record<string, string> = {
    no_leads: 'need clients OR no leads OR struggling to find customers',
    low_conversions: 'low conversion OR poor sales',
    no_marketing: 'no marketing OR need marketing help',
    looking_for_clients: 'looking for clients OR need customers',
    bad_ads: 'bad ads OR poor creatives',
    hiring_marketing: 'hiring marketing OR need designer',
    weak_branding: 'no website OR need branding',
    competitor_complaints: 'competitor OR falling behind',
  };

  const signals = (params.problemSignals || ['no_leads'])
    .map((s) => signalMap[s] || s)
    .join(' OR ');

  const custom = params.customSignals || '';
  const industry = params.industry || '';

  return [signals, custom, industry].filter(Boolean).join(' ');
}

// POST /api/search — Direct scraping, no n8n dependency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body as { action: string; params: SearchParams };

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const sources = params?.sources || ['reddit'];
    const keywords = buildKeywords(params || {});
    const industry = params?.industry || '';
    const location = params?.location || '';
    const apolloKey = process.env.APOLLO_API_KEY || '';

    // Run all selected scrapers in parallel
    const scraperPromises: Promise<RawLead[]>[] = [];
    const sourceNames: string[] = [];

    if (sources.includes('reddit')) {
      scraperPromises.push(scrapeReddit(keywords, industry));
      sourceNames.push('Reddit');
    }
    if (sources.includes('fiverr')) {
      scraperPromises.push(scrapeFiverr(keywords, industry));
      sourceNames.push('Fiverr');
    }
    if (sources.includes('gozambiajobs')) {
      scraperPromises.push(scrapeGoZambiaJobs(keywords, industry));
      sourceNames.push('GoZambiaJobs');
    }
    if (sources.includes('google')) {
      scraperPromises.push(scrapeGoogle(keywords, industry, location));
      sourceNames.push('Google');
    }
    if (sources.includes('linkedin') || sources.includes('facebook')) {
      if (apolloKey) {
        scraperPromises.push(scrapeApollo(keywords, industry, location, apolloKey));
        sourceNames.push('Apollo (LinkedIn/Facebook)');
      } else {
        // No API key — return helpful message
        scraperPromises.push(
          Promise.resolve([
            {
              id: 'apollo-setup',
              title: 'Apollo.io API key needed for LinkedIn/Facebook',
              body: 'Add APOLLO_API_KEY to your Vercel environment variables. Get a free key at https://app.apollo.io — Settings > API Keys.',
              author: 'System',
              source: 'LinkedIn',
              source_url: 'https://app.apollo.io',
              found_at: new Date().toISOString(),
              email: null,
              phone: null,
              company_website: null,
            },
          ])
        );
        sourceNames.push('Apollo (needs API key)');
      }
    }

    // If no sources selected, default to Reddit
    if (scraperPromises.length === 0) {
      scraperPromises.push(scrapeReddit(keywords, industry));
      sourceNames.push('Reddit');
    }

    // Run all scrapers in parallel
    const results = await Promise.allSettled(scraperPromises);

    // Collect all leads
    const allLeads: RawLead[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        allLeads.push(...result.value);
      } else {
        console.error(`Scraper ${sourceNames[i]} failed:`, result.reason);
      }
    }

    // Format leads for the frontend
    const formattedLeads = allLeads.map((lead) => ({
      id: lead.id,
      company_name: lead.author || 'Unknown',
      website: lead.company_website,
      profile_url: lead.source_url,
      industry: industry || 'General',
      location: location || null,
      detected_problem: 'looking_for_clients',
      pain_summary: lead.body?.substring(0, 400) || lead.title,
      confidence_score: lead.email ? 75 : lead.phone ? 70 : lead.company_website ? 60 : 45,
      urgency: (lead.email || lead.phone) ? 'high' as const : 'medium' as const,
      outreach_suggestion: `Hi ${lead.author}! I came across your profile and noticed you might benefit from professional graphic design and motion graphics services. Would you be open to a quick chat about how we can help grow your brand?`,
      source: lead.source,
      source_url: lead.source_url,
      found_at: lead.found_at,
      email: lead.email,
      phone: lead.phone,
      company_website: lead.company_website,
    }));

    // Sort: leads with contact info first, then by source diversity
    formattedLeads.sort((a, b) => {
      const aScore = (a.email ? 30 : 0) + (a.phone ? 25 : 0) + (a.company_website ? 15 : 0);
      const bScore = (b.email ? 30 : 0) + (b.phone ? 25 : 0) + (b.company_website ? 15 : 0);
      return bScore - aScore;
    });

    return NextResponse.json({
      leads: formattedLeads,
      meta: {
        total: formattedLeads.length,
        sources: sourceNames,
        withEmail: formattedLeads.filter((l) => l.email).length,
        withPhone: formattedLeads.filter((l) => l.phone).length,
        scrapedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
