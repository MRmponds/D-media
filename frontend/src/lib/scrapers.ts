// Direct scraping modules — no n8n dependency
// Each function returns an array of raw lead objects

export interface RawLead {
  id: string;
  title: string;
  body: string;
  author: string;
  source: string;
  source_url: string | null;
  found_at: string;
  email: string | null;
  phone: string | null;
  company_website: string | null;
}

// Extract contact info from text
function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (match && match[0].replace(/\D/g, '').length >= 7) return match[0].trim();
  return null;
}

function extractWebsite(text: string): string | null {
  const match = text.match(/https?:\/\/(?!(?:reddit|imgur|i\.redd|preview\.redd|youtube|youtu\.be|twitter|x\.com|facebook|fb\.com))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)"]*/i);
  return match ? match[0] : null;
}

// ============================================
// REDDIT SCRAPER (Free, public JSON API)
// ============================================
export async function scrapeReddit(keywords: string, industry: string): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const seen = new Set<string>();

  const subreddits = [
    'smallbusiness', 'entrepreneur', 'marketing', 'startups',
    'freelance', 'design_critiques', 'advertising', 'graphic_design',
  ];

  // General search + subreddit-specific searches
  const urls = [
    `https://www.reddit.com/search.json?q=${encodeURIComponent(keywords)}&sort=new&limit=30&t=month`,
    ...subreddits.slice(0, 4).map(sub =>
      `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(keywords)}&restrict_sr=1&sort=new&limit=20&t=month`
    ),
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LeadFinder/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const d = post.data;
        if (!d.selftext || d.selftext.length < 50) continue;
        const key = d.id;
        if (seen.has(key)) continue;
        seen.add(key);

        const fullText = `${d.title} ${d.selftext}`;
        leads.push({
          id: `reddit-${d.id}`,
          title: d.title || '',
          body: d.selftext.substring(0, 2000),
          author: d.author || 'anonymous',
          source: 'Reddit',
          source_url: `https://reddit.com${d.permalink}`,
          found_at: d.created_utc
            ? new Date(d.created_utc * 1000).toISOString()
            : new Date().toISOString(),
          email: extractEmail(fullText),
          phone: extractPhone(fullText),
          company_website: extractWebsite(fullText),
        });
      }
    } catch {
      // Skip failed requests
    }
  }

  return leads;
}

// ============================================
// FIVERR SCRAPER (Public gig/buyer pages)
// ============================================
export async function scrapeFiverr(keywords: string, industry: string): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const query = encodeURIComponent(`${industry || 'graphic design'} ${keywords}`.trim());

  try {
    // Scrape Fiverr search results page
    const url = `https://www.fiverr.com/search/gigs?query=${query}&source=top-bar&search_in=everywhere&search-autocomplete-original-term=${query}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return leads;

    const html = await res.text();

    // Extract gig data from HTML - look for seller usernames and gig titles
    const gigPattern = /<h3[^>]*class="[^"]*"[^>]*>(.*?)<\/h3>/g;
    const sellerPattern = /href="\/([a-zA-Z0-9_]+)\?/g;

    const gigs: string[] = [];
    let match;
    while ((match = gigPattern.exec(html)) !== null) {
      gigs.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    const sellers = new Set<string>();
    while ((match = sellerPattern.exec(html)) !== null) {
      if (match[1] !== 'search' && match[1] !== 'categories') {
        sellers.add(match[1]);
      }
    }

    const sellerArr = Array.from(sellers).slice(0, 15);
    for (let i = 0; i < sellerArr.length; i++) {
      const seller = sellerArr[i];
      leads.push({
        id: `fiverr-${seller}-${i}`,
        title: gigs[i] || `Fiverr seller: ${seller}`,
        body: `Fiverr seller "${seller}" found searching for "${industry || 'design'}" services. This person is either offering or looking for creative services on Fiverr.`,
        author: seller,
        source: 'Fiverr',
        source_url: `https://www.fiverr.com/${seller}`,
        found_at: new Date().toISOString(),
        email: null,
        phone: null,
        company_website: null,
      });
    }
  } catch {
    // Fiverr might block — that's fine
  }

  return leads;
}

// ============================================
// GO ZAMBIA JOBS SCRAPER (Public job board)
// ============================================
export async function scrapeGoZambiaJobs(keywords: string, industry: string): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const query = encodeURIComponent(`${industry || ''} marketing design graphic`.trim());

  try {
    const url = `https://www.gozambiajobs.com/search/${query}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return leads;

    const html = await res.text();

    // Extract job listings - titles, companies, links
    const jobPattern = /<a[^>]*href="(\/vacancy\/[^"]+)"[^>]*>(.*?)<\/a>/gi;
    const companyPattern = /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/gi;

    const jobs: Array<{ title: string; url: string }> = [];
    let match;
    while ((match = jobPattern.exec(html)) !== null) {
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title.length > 5) {
        jobs.push({ title, url: `https://www.gozambiajobs.com${match[1]}` });
      }
    }

    const companies: string[] = [];
    while ((match = companyPattern.exec(html)) !== null) {
      companies.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    for (let i = 0; i < Math.min(jobs.length, 20); i++) {
      const job = jobs[i];
      const company = companies[i] || 'Unknown Company';

      leads.push({
        id: `gzj-${i}-${Date.now()}`,
        title: job.title,
        body: `${company} is hiring: "${job.title}". Companies hiring for marketing/design roles are potential clients who need creative services.`,
        author: company,
        source: 'GoZambiaJobs',
        source_url: job.url,
        found_at: new Date().toISOString(),
        email: extractEmail(html.substring(i * 500, (i + 1) * 500)) || null,
        phone: null,
        company_website: null,
      });
    }
  } catch {
    // Site might be down
  }

  return leads;
}

// ============================================
// GOOGLE SCRAPER (Limited, may get blocked)
// ============================================
export async function scrapeGoogle(keywords: string, industry: string, location: string): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const query = `${industry || 'business'} ${location || 'Zambia'} "need" OR "looking for" OR "hiring" graphic designer OR marketing OR advertising`;

  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return leads;

    const html = await res.text();

    // Extract search result links and titles
    const resultPattern = /<a[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>.*?<h3[^>]*>(.*?)<\/h3>/gi;
    let match;
    let i = 0;

    while ((match = resultPattern.exec(html)) !== null && i < 15) {
      const resultUrl = decodeURIComponent(match[1]);
      const title = match[2].replace(/<[^>]+>/g, '').trim();

      if (resultUrl.includes('google.com') || resultUrl.includes('youtube.com')) continue;

      leads.push({
        id: `google-${i}-${Date.now()}`,
        title,
        body: `Found via Google search: "${title}". This result appeared when searching for businesses needing design/marketing services in ${location || 'Zambia'}.`,
        author: new URL(resultUrl).hostname.replace('www.', ''),
        source: 'Google',
        source_url: resultUrl,
        found_at: new Date().toISOString(),
        email: null,
        phone: null,
        company_website: resultUrl,
      });
      i++;
    }
  } catch {
    // Google blocks automated requests frequently
  }

  return leads;
}

// ============================================
// APOLLO.IO INTEGRATION (LinkedIn + Facebook + contacts)
// ============================================
export async function scrapeApollo(
  keywords: string,
  industry: string,
  location: string,
  apiKey: string
): Promise<RawLead[]> {
  const leads: RawLead[] = [];

  if (!apiKey) return leads;

  try {
    // Apollo People Search API
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_keywords: keywords || 'marketing design advertising',
        person_titles: ['CEO', 'Founder', 'Owner', 'Marketing Manager', 'Marketing Director', 'CMO', 'Business Owner'],
        person_locations: location ? [location] : ['Zambia'],
        per_page: 25,
        page: 1,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Apollo API error:', res.status, errText);
      return leads;
    }

    const data = await res.json();
    const people = data.people || [];

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const org = person.organization || {};

      leads.push({
        id: `apollo-${person.id || i}`,
        title: `${person.first_name || ''} ${person.last_name || ''} — ${person.title || 'Unknown Role'}`.trim(),
        body: `${person.first_name} ${person.last_name} is ${person.title || 'a professional'} at ${org.name || 'Unknown Company'}. ${org.short_description || ''} Located in ${person.city || ''} ${person.state || ''} ${person.country || ''}.`.trim(),
        author: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        source: person.linkedin_url ? 'LinkedIn' : 'Apollo',
        source_url: person.linkedin_url || null,
        found_at: new Date().toISOString(),
        email: person.email || null,
        phone: person.phone_numbers?.[0]?.sanitized_number || null,
        company_website: org.website_url || org.primary_domain ? `https://${org.primary_domain}` : null,
      });
    }
  } catch (err) {
    console.error('Apollo scrape error:', err);
  }

  return leads;
}
