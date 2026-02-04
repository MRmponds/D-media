# D-Media Lead Generation System - Architecture

## System Overview

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  DATA SOURCES    |---->|  n8n BACKEND     |---->|  SUPABASE DB     |
|                  |     |  (Automation)    |     |  (PostgreSQL)    |
|  - Reddit API    |     |                  |     |                  |
|  - Job Boards    |     |  4 Workflows:    |     |  7 Tables:       |
|  - Fiverr        |     |  1. Reddit Scan  |     |  - leads         |
|  - Facebook      |     |  2. Web Scan     |     |  - keywords      |
|  - Google Search |     |  3. AI Requalify |     |  - platforms     |
|                  |     |  4. Error Handler|     |  - settings      |
+------------------+     +--------+---------+     |  - scan_logs     |
                                  |               |  - status_history|
                                  |               |  - templates     |
                         +--------v---------+     +--------+---------+
                         |                  |              |
                         |  OPENAI API      |              |
                         |  (GPT-4o-mini)   |     +--------v---------+
                         |                  |     |                  |
                         |  - Lead scoring  |     |  NEXT.JS         |
                         |  - Problem detect|     |  FRONTEND        |
                         |  - Outreach gen  |     |                  |
                         +------------------+     |  - Dashboard     |
                                                  |  - Leads Table   |
                                                  |  - Lead Detail   |
                                                  |  - Settings      |
                                                  |  - Auth (Login)  |
                                                  +------------------+
```

## Component Architecture

### 1. Backend (n8n Workflows)

Four independent workflows, each with its own schedule:

#### Workflow 1: Reddit Lead Scanner
- **Schedule**: Daily at 06:00 UTC
- **ID**: `JpkPLDnBSZeCJ6LP`
- **Node chain**:
  ```
  Schedule Trigger
    -> Load Search Queries (Code: generates subreddit+keyword combos)
    -> Fetch Reddit Posts (HTTP: Reddit public JSON API)
    -> Parse Reddit Results (Code: normalize post data)
    -> Has Results? (IF: skip empty batches)
    -> Keyword Match & Score (Code: match against 30+ keywords)
    -> Score Above Threshold? (IF: keyword_score >= 15)
    -> AI Lead Qualification (OpenAI: GPT-4o-mini scoring)
    -> Merge AI Results (Code: combine scores + generate hash)
    -> Final Score Check (IF: lead_score >= 30)
    -> Store Lead in DB (Postgres: upsert with dedup)
    -> Log Scan Results (Code: summary)
  ```
- **Data sources**: 11 subreddits x 12 queries = 132 API calls
- **Rate limiting**: Built-in via n8n execution, ~2 req/sec
- **Dedup**: SHA256 hash on `platform:post_content`

#### Workflow 2: Job Board & Web Scanner
- **Schedule**: Daily at 07:00 UTC
- **ID**: `svt8rUHXi9jjRyrj`
- **Node chain**:
  ```
  Schedule Trigger
    -> Define Scan Sources (Code: GoZambiaJobs, Fiverr, Indeed, Google)
    -> Fetch Source Pages (HTTP: full page scrape)
    -> Extract & Normalize Leads (Code: HTML-to-text + entry extraction)
    -> Flatten Lead Arrays (Code: normalize to individual items)
    -> Has Leads? (IF)
    -> Keyword Score & Hash (Code)
    -> Score OK? (IF: keyword_score >= 10)
    -> AI Qualify Lead (OpenAI)
    -> Merge AI + Lead Data (Code)
    -> Store Lead in DB (Postgres)
  ```
- **Data sources**: 5 configurable web sources
- **Rate limiting**: Sequential execution, 5s wait between retries

#### Workflow 3: Lead Re-Qualifier (Batch AI)
- **Schedule**: Daily at 09:00 UTC
- **ID**: `3EqQszLtU8c4TYSO`
- **Purpose**: Re-process leads that got keyword scores but no AI analysis
- **Node chain**:
  ```
  Schedule Trigger
    -> Get Unscored Leads (Postgres: WHERE lead_score=0 OR ai_summary IS NULL)
    -> Has Unscored? (IF)
    -> AI Requalify (OpenAI)
    -> Prepare Update (Code: parse AI JSON)
    -> Valid Result? (IF)
    -> Update Lead Score (Postgres: UPDATE)
  ```
- **Batch size**: 50 leads per run
- **Window**: Only processes leads from last 7 days

#### Workflow 4: Error Handler
- **Trigger**: Error Trigger (fires when any other workflow fails)
- **ID**: `xYKQymKOu1Zha0W0`
- **Node chain**:
  ```
  On Workflow Error
    -> Format Error Details (Code)
    -> Log Error to DB (Postgres: scan_logs table)
  ```

### 2. Database (Supabase/PostgreSQL)

#### Schema: 7 Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `leads` | Core lead storage | id, platform, post_content, lead_score, status, content_hash |
| `keywords` | Configurable search phrases | phrase, category, weight, enabled, match_count |
| `platforms` | Platform configuration | name, enabled, config (JSONB), rate_limit |
| `settings` | Key-value app config | key, value (JSONB) |
| `scan_logs` | Execution audit trail | platform, status, leads_found/new/duplicate |
| `lead_status_history` | Status change audit | lead_id, old_status, new_status |
| `outreach_templates` | Reusable message templates | name, body, variables[] |

#### Views (pre-computed queries)

| View | Purpose |
|------|---------|
| `v_dashboard_summary` | Aggregate stats for dashboard |
| `v_platform_stats` | Per-platform lead counts and scores |
| `v_score_distribution` | Score bucket breakdown (hot/warm/mild/cold) |
| `v_recent_scans` | Latest scan activity with platform names |

#### Key Design Decisions
- **Deduplication**: `content_hash` (SHA256) with unique constraint + `ON CONFLICT DO NOTHING`
- **RLS enabled**: All tables use Row Level Security for Supabase auth
- **Auto-triggers**: `updated_at` timestamps, status change logging, `contacted_at` auto-set
- **Indexes**: Trigram index on post_content for fuzzy search, GIN on matched_keywords array

### 3. Frontend (Next.js)

#### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS (custom design tokens via CSS variables)
- Supabase JS (client + server)
- Recharts (charts)
- Lucide React (icons)

#### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Stat cards, score chart, platform breakdown, recent leads |
| `/leads` | Lead Table | Filterable, searchable, sortable table with status management |
| `/leads/[id]` | Lead Detail | Full post, AI analysis, outreach message, notes, status controls |
| `/settings` | Settings | Keywords manager, platform toggles, general config |
| `/login` | Auth | Email/password login via Supabase Auth |

#### Key Features
- **Dark/Light mode**: CSS variable-based theming with localStorage persistence
- **Collapsible sidebar**: Full navigation with branding
- **Real-time filters**: Platform, status, score, search - all client-side Supabase queries
- **Inline status editing**: Change lead status directly from the table
- **Copy outreach**: One-click copy of AI-generated outreach messages
- **Auth middleware**: Automatic redirect to login for unauthenticated users

#### API Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/leads` | GET, POST, PATCH | List/create/batch-update leads |
| `/api/keywords` | GET, POST, DELETE | Manage keywords |
| `/api/settings` | GET, PUT | Read/update settings |

### 4. AI Integration (OpenAI)

#### Model: GPT-4o-mini
- **Temperature**: 0.3 (consistent scoring)
- **Max tokens**: 500
- **Used for**: Lead scoring, problem detection, outreach generation

#### Scoring Rubric
```
TOTAL: 0-100 points

INTENT (0-30):    Is the poster actively seeking creative help?
PAIN LEVEL (0-25): How urgent/severe is their problem?
FIT (0-25):       Do they specifically need motion graphics/ad creatives?
ACCESSIBILITY (0-20): Can D-Media reach and serve this lead?
```

#### AI Prompt (System Message)
```
You are a lead qualification AI for D-Media, a professional motion
graphics designer who creates high-converting ad creatives.

Analyze social media posts and determine if the poster is a potential
client. Score them 0-100 based on:
- INTENT (actively seeking help?): 0-30 points
- PAIN LEVEL (how urgent?): 0-25 points
- FIT (need motion graphics/ad creatives?): 0-25 points
- ACCESSIBILITY (can we reach them?): 0-20 points

Respond ONLY with valid JSON:
{
  "lead_score": <number 0-100>,
  "detected_problem": "<one sentence describing their problem>",
  "ai_summary": "<2-3 sentence analysis>",
  "score_reasoning": "<Intent X/30, Pain X/25, Fit X/25, Access X/20>",
  "suggested_outreach": "<personalized 3-4 sentence DM>"
}
```

## Data Flow

```
1. DISCOVERY (06:00-07:00 UTC)
   Reddit API / Web Scraping
        |
        v
2. EXTRACTION
   HTML parsing, post normalization
        |
        v
3. KEYWORD MATCHING
   30+ keywords across 4 categories
   (pain_signal, hiring, request, complaint)
        |
        v
4. AI QUALIFICATION (via OpenAI)
   Score 0-100, problem detection, outreach generation
        |
        v
5. DEDUP & STORAGE
   SHA256 hash check -> Supabase upsert
        |
        v
6. RE-QUALIFICATION (09:00 UTC)
   Batch process any leads that missed AI scoring
        |
        v
7. FRONTEND DISPLAY
   Dashboard -> Lead Table -> Lead Detail -> Outreach
```

## Lead Lifecycle

```
[Discovered] -> [New] -> [Contacted] -> [Responded] -> [Qualified] -> [Closed]
                  |                                          |
                  +-> [Archived] <---------------------------+
```

## Security

- **Auth**: Supabase email/password authentication
- **RLS**: Row-level security on all tables
- **API protection**: Webhook endpoints require `x-webhook-secret` header
- **No hardcoded secrets**: All credentials in environment variables
- **Public data only**: All scraping targets public APIs and pages
- **Rate limiting**: Built into n8n execution + configurable per-platform limits

## Estimated Costs (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Supabase | Free tier (500MB DB, 50K auth) | $0 |
| n8n | Self-hosted (EasyPanel) | $0 (existing) |
| OpenAI | GPT-4o-mini (~50 leads/day x 500 tokens) | ~$2-5 |
| Vercel/Netlify | Free tier (Next.js hosting) | $0 |
| **Total** | | **~$2-5/month** |
