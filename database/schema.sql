-- ============================================================
-- D-MEDIA LEAD GENERATION SYSTEM
-- Database Schema for Supabase (PostgreSQL)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'responded', 'qualified', 'closed', 'archived');
CREATE TYPE platform_name AS ENUM ('reddit', 'fiverr', 'facebook', 'gozambiajobs', 'linkedin', 'twitter', 'other');
CREATE TYPE scan_status AS ENUM ('running', 'completed', 'failed', 'partial');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. PLATFORMS
-- Configurable platform sources for scanning
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name platform_name NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',  -- Platform-specific config (subreddits, URLs, etc.)
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 60,
    last_scan_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. KEYWORDS
-- Keywords and phrases to detect pain signals
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phrase TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',  -- e.g., 'pain_signal', 'hiring', 'request', 'complaint'
    weight NUMERIC(3,2) NOT NULL DEFAULT 1.00,  -- Multiplier for lead scoring (0.10 - 3.00)
    enabled BOOLEAN NOT NULL DEFAULT true,
    match_count INTEGER NOT NULL DEFAULT 0,  -- How many times this keyword matched
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT keywords_phrase_unique UNIQUE (phrase),
    CONSTRAINT keywords_weight_range CHECK (weight >= 0.10 AND weight <= 3.00)
);

-- 3. LEADS
-- Core leads table - all discovered leads normalized here
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source identification
    platform platform_name NOT NULL,
    platform_post_id TEXT,  -- Original post/listing ID on the platform
    source_url TEXT NOT NULL,

    -- Contact info
    username TEXT,
    business_name TEXT,
    contact_method TEXT,  -- email, DM, profile link, etc.
    contact_value TEXT,   -- The actual contact info

    -- Content
    post_title TEXT,
    post_content TEXT NOT NULL,
    post_date TIMESTAMPTZ,

    -- AI analysis
    detected_problem TEXT,
    matched_keywords TEXT[] DEFAULT '{}',
    keyword_match_count INTEGER NOT NULL DEFAULT 0,
    ai_summary TEXT,
    lead_score INTEGER NOT NULL DEFAULT 0,  -- 0-100
    score_reasoning TEXT,
    suggested_outreach TEXT,

    -- Status tracking
    status lead_status NOT NULL DEFAULT 'new',
    notes TEXT,
    contacted_at TIMESTAMPTZ,

    -- Metadata
    raw_data JSONB DEFAULT '{}',  -- Full raw scraped data
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Deduplication
    content_hash TEXT NOT NULL,  -- SHA256 of platform + post_content for dedup

    CONSTRAINT leads_content_hash_unique UNIQUE (content_hash),
    CONSTRAINT leads_score_range CHECK (lead_score >= 0 AND lead_score <= 100)
);

-- 4. LEAD STATUS HISTORY
-- Track all status changes for audit trail
CREATE TABLE lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    old_status lead_status,
    new_status lead_status NOT NULL,
    changed_by TEXT DEFAULT 'system',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SCAN LOGS
-- Track each scan execution
CREATE TABLE scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform platform_name NOT NULL,
    workflow_execution_id TEXT,  -- n8n execution ID
    status scan_status NOT NULL DEFAULT 'running',
    leads_found INTEGER NOT NULL DEFAULT 0,
    leads_new INTEGER NOT NULL DEFAULT 0,
    leads_duplicate INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- 6. SETTINGS
-- Application settings (key-value store)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. OUTREACH TEMPLATES
-- Reusable outreach message templates
CREATE TABLE outreach_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    platform platform_name,  -- NULL means applicable to all platforms
    variables TEXT[] DEFAULT '{}',  -- Available merge variables like {business_name}, {problem}
    use_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Leads indexes
CREATE INDEX idx_leads_platform ON leads(platform);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_discovered ON leads(discovered_at DESC);
CREATE INDEX idx_leads_content_hash ON leads(content_hash);
CREATE INDEX idx_leads_platform_status ON leads(platform, status);
CREATE INDEX idx_leads_score_status ON leads(lead_score DESC, status);
CREATE INDEX idx_leads_post_content_trgm ON leads USING gin(post_content gin_trgm_ops);
CREATE INDEX idx_leads_matched_keywords ON leads USING gin(matched_keywords);

-- Scan logs indexes
CREATE INDEX idx_scan_logs_platform ON scan_logs(platform);
CREATE INDEX idx_scan_logs_started ON scan_logs(started_at DESC);

-- Status history indexes
CREATE INDEX idx_status_history_lead ON lead_status_history(lead_id);
CREATE INDEX idx_status_history_created ON lead_status_history(created_at DESC);

-- Keywords indexes
CREATE INDEX idx_keywords_enabled ON keywords(enabled);
CREATE INDEX idx_keywords_category ON keywords(category);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_keywords_updated_at
    BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_platforms_updated_at
    BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_outreach_templates_updated_at
    BEFORE UPDATE ON outreach_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO lead_status_history (lead_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leads_status_change
    AFTER UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- Auto-set contacted_at when status changes to 'contacted'
CREATE OR REPLACE FUNCTION set_contacted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'contacted' AND OLD.status != 'contacted' AND NEW.contacted_at IS NULL THEN
        NEW.contacted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leads_set_contacted
    BEFORE UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION set_contacted_at();

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users full access (single-tenant app)
CREATE POLICY "Authenticated users can read leads"
    ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads"
    ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads"
    ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads"
    ON leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage keywords"
    ON keywords FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage platforms"
    ON platforms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage settings"
    ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read scan logs"
    ON scan_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read status history"
    ON lead_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage templates"
    ON outreach_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role policies (for n8n backend)
CREATE POLICY "Service role full access to leads"
    ON leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to keywords"
    ON keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to platforms"
    ON platforms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to settings"
    ON settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to scan logs"
    ON scan_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to status history"
    ON lead_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to templates"
    ON outreach_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default platforms
INSERT INTO platforms (name, display_name, config) VALUES
('reddit', 'Reddit', '{"subreddits": ["smallbusiness", "marketing", "Entrepreneur", "advertising", "socialmedia", "digital_marketing", "PPC", "facebook_ads"], "search_queries": ["need ad creative", "ads not converting", "looking for motion designer", "UGC content help", "marketing not working", "bad ad performance", "need video ads", "looking for ad agency"], "posts_per_query": 25}'),
('fiverr', 'Fiverr', '{"categories": ["video-animation", "graphics-design"], "search_terms": ["motion graphics", "ad creative", "video ad", "UGC"], "check_buyer_requests": true}'),
('facebook', 'Facebook', '{"group_urls": [], "search_queries": ["need ad designer", "looking for creative agency", "ads not working"], "note": "Requires manual group URL configuration"}'),
('gozambiajobs', 'GoZambiaJobs', '{"base_url": "https://www.gozambiajobs.com", "categories": ["marketing", "design", "media"], "rss_url": ""}'),
('linkedin', 'LinkedIn', '{"enabled": false, "note": "Requires LinkedIn API access - configure separately"}'),
('twitter', 'Twitter/X', '{"enabled": false, "search_queries": ["need ad creative", "looking for motion designer"], "note": "Requires Twitter API access"}');

-- Default keywords with categories and weights
INSERT INTO keywords (phrase, category, weight) VALUES
-- Pain signals (high weight)
('ads not converting', 'pain_signal', 2.50),
('low conversion rate', 'pain_signal', 2.50),
('bad ad performance', 'pain_signal', 2.50),
('marketing not working', 'pain_signal', 2.00),
('wasting ad spend', 'pain_signal', 2.50),
('poor ad quality', 'pain_signal', 2.00),
('ads are terrible', 'pain_signal', 2.00),
('creative fatigue', 'pain_signal', 2.00),
('low ROAS', 'pain_signal', 2.50),
('ad CTR low', 'pain_signal', 2.00),
-- Hiring signals (high weight)
('need motion designer', 'hiring', 3.00),
('looking for ad creative', 'hiring', 3.00),
('hiring video editor', 'hiring', 2.50),
('need ad agency', 'hiring', 2.50),
('looking for animator', 'hiring', 2.50),
('freelance motion graphics', 'hiring', 3.00),
('need someone to create ads', 'hiring', 3.00),
-- Request signals (medium weight)
('UGC content', 'request', 1.50),
('video ad production', 'request', 2.00),
('motion graphics', 'request', 1.50),
('ad creative services', 'request', 2.00),
('social media ads', 'request', 1.50),
('Facebook ads help', 'request', 1.50),
('Instagram reels', 'request', 1.00),
('TikTok ads', 'request', 1.50),
-- Complaint signals (medium weight)
('designer let me down', 'complaint', 2.00),
('bad freelancer experience', 'complaint', 1.50),
('poor quality work', 'complaint', 1.50),
('need better creatives', 'complaint', 2.00),
('ads look unprofessional', 'complaint', 2.00),
('branding is weak', 'complaint', 1.50);

-- Default settings
INSERT INTO settings (key, value, description) VALUES
('lead_score_threshold', '40', 'Minimum lead score to surface (0-100)'),
('daily_scan_time', '"06:00"', 'UTC time for daily scan execution'),
('ai_model', '"gpt-4o-mini"', 'OpenAI model for lead qualification'),
('ai_temperature', '0.3', 'AI temperature for scoring (lower = more consistent)'),
('max_leads_per_scan', '100', 'Maximum leads to process per platform per scan'),
('dedup_window_days', '30', 'Days to check for duplicate content'),
('auto_generate_outreach', 'true', 'Automatically generate outreach messages for high-score leads'),
('outreach_score_threshold', '60', 'Minimum score to auto-generate outreach messages'),
('notification_email', '""', 'Email for scan notifications (empty = disabled)'),
('retention_days', '180', 'Days to retain archived leads before deletion');

-- Default outreach templates
INSERT INTO outreach_templates (name, subject, body, variables) VALUES
('General Introduction',
 'Professional Ad Creatives for {business_name}',
 'Hi {username},

I noticed your post about {detected_problem}. I''m a professional motion graphics designer specializing in high-converting ad creatives.

I''ve helped businesses like yours solve exactly this problem by creating:
- Scroll-stopping video ads
- Professional motion graphics
- UGC-style content that converts

Would you be open to a quick chat about how I can help? I''d love to share some relevant examples from my portfolio.

Best regards,
D-Media',
 ARRAY['username', 'business_name', 'detected_problem']),

('Pain Point Response',
 'I Can Help Fix Your {detected_problem}',
 'Hey {username},

I saw your post about {detected_problem} and it really resonated with me - I''ve seen many businesses struggle with the same issue.

The good news? The right creative can completely transform your ad performance. I specialize in creating motion graphics and video ads that are designed to convert.

Here''s what I typically deliver:
- Custom video ads optimized for your target platform
- A/B test variations to find what works
- Fast turnaround without sacrificing quality

Want me to take a look at your current ads and share some quick ideas?

D-Media',
 ARRAY['username', 'detected_problem']);

-- ============================================================
-- VIEWS
-- ============================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    COUNT(*) FILTER (WHERE discovered_at >= CURRENT_DATE) AS leads_today,
    COUNT(*) FILTER (WHERE discovered_at >= CURRENT_DATE - INTERVAL '7 days') AS leads_this_week,
    COUNT(*) FILTER (WHERE status = 'new') AS leads_new,
    COUNT(*) FILTER (WHERE status = 'contacted') AS leads_contacted,
    COUNT(*) FILTER (WHERE status = 'responded') AS leads_responded,
    COUNT(*) FILTER (WHERE status = 'qualified') AS leads_qualified,
    COUNT(*) FILTER (WHERE status = 'closed') AS leads_closed,
    COUNT(*) AS leads_total,
    ROUND(AVG(lead_score), 1) AS avg_score,
    MAX(lead_score) AS max_score
FROM leads;

-- Platform breakdown view
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT
    platform,
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE discovered_at >= CURRENT_DATE) AS today,
    COUNT(*) FILTER (WHERE discovered_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
    ROUND(AVG(lead_score), 1) AS avg_score,
    COUNT(*) FILTER (WHERE status = 'new') AS new_count,
    COUNT(*) FILTER (WHERE status = 'contacted') AS contacted_count
FROM leads
GROUP BY platform
ORDER BY total_leads DESC;

-- Score distribution view
CREATE OR REPLACE VIEW v_score_distribution AS
SELECT
    CASE
        WHEN lead_score >= 80 THEN 'hot (80-100)'
        WHEN lead_score >= 60 THEN 'warm (60-79)'
        WHEN lead_score >= 40 THEN 'mild (40-59)'
        ELSE 'cold (0-39)'
    END AS score_bucket,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percentage
FROM leads
GROUP BY score_bucket
ORDER BY MIN(lead_score) DESC;

-- Recent scan activity
CREATE OR REPLACE VIEW v_recent_scans AS
SELECT
    sl.*,
    p.display_name AS platform_display_name
FROM scan_logs sl
JOIN platforms p ON p.name = sl.platform
ORDER BY sl.started_at DESC
LIMIT 50;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to check for duplicate leads by content hash
CREATE OR REPLACE FUNCTION check_lead_duplicate(p_content_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM leads WHERE content_hash = p_content_hash);
END;
$$ LANGUAGE plpgsql;

-- Function to get active keywords as array for matching
CREATE OR REPLACE FUNCTION get_active_keywords()
RETURNS TABLE (phrase TEXT, category TEXT, weight NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT k.phrase, k.category, k.weight
    FROM keywords k
    WHERE k.enabled = true
    ORDER BY k.weight DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate keyword-based score component
CREATE OR REPLACE FUNCTION calculate_keyword_score(p_content TEXT)
RETURNS TABLE (score INTEGER, matched TEXT[], match_count INTEGER) AS $$
DECLARE
    v_score NUMERIC := 0;
    v_matched TEXT[] := '{}';
    v_count INTEGER := 0;
    v_keyword RECORD;
BEGIN
    FOR v_keyword IN SELECT k.phrase, k.weight FROM keywords k WHERE k.enabled = true LOOP
        IF p_content ILIKE '%' || v_keyword.phrase || '%' THEN
            v_score := v_score + (10 * v_keyword.weight);
            v_matched := array_append(v_matched, v_keyword.phrase);
            v_count := v_count + 1;

            -- Update keyword match count
            UPDATE keywords SET match_count = keywords.match_count + 1 WHERE keywords.phrase = v_keyword.phrase;
        END IF;
    END LOOP;

    -- Cap at 100
    score := LEAST(v_score::INTEGER, 100);
    matched := v_matched;
    match_count := v_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
