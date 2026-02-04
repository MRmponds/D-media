// ============================================================
// D-MEDIA LEAD GENERATION SYSTEM - TypeScript Types
// ============================================================

export type LeadStatus = 'new' | 'contacted' | 'responded' | 'qualified' | 'closed' | 'archived';
export type PlatformName = 'reddit' | 'fiverr' | 'facebook' | 'gozambiajobs' | 'linkedin' | 'twitter' | 'other';
export type ScanStatus = 'running' | 'completed' | 'failed' | 'partial';
export type ScoreBucket = 'hot' | 'warm' | 'mild' | 'cold';

export interface Lead {
  id: string;
  platform: PlatformName;
  platform_post_id: string | null;
  source_url: string;
  username: string | null;
  business_name: string | null;
  contact_method: string | null;
  contact_value: string | null;
  post_title: string | null;
  post_content: string;
  post_date: string | null;
  detected_problem: string | null;
  matched_keywords: string[];
  keyword_match_count: number;
  ai_summary: string | null;
  lead_score: number;
  score_reasoning: string | null;
  suggested_outreach: string | null;
  status: LeadStatus;
  notes: string | null;
  contacted_at: string | null;
  raw_data: Record<string, unknown>;
  discovered_at: string;
  created_at: string;
  updated_at: string;
  content_hash: string;
}

export interface Keyword {
  id: string;
  phrase: string;
  category: string;
  weight: number;
  enabled: boolean;
  match_count: number;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  name: PlatformName;
  display_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  rate_limit_per_hour: number;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanLog {
  id: string;
  platform: PlatformName;
  workflow_execution_id: string | null;
  status: ScanStatus;
  leads_found: number;
  leads_new: number;
  leads_duplicate: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface OutreachTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  platform: PlatformName | null;
  variables: string[];
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  leads_today: number;
  leads_this_week: number;
  leads_new: number;
  leads_contacted: number;
  leads_responded: number;
  leads_qualified: number;
  leads_closed: number;
  leads_total: number;
  avg_score: number;
  max_score: number;
}

export interface PlatformStats {
  platform: PlatformName;
  total_leads: number;
  today: number;
  this_week: number;
  avg_score: number;
  new_count: number;
  contacted_count: number;
}

export interface ScoreDistribution {
  score_bucket: string;
  count: number;
  percentage: number;
}

export interface LeadFilters {
  platform?: PlatformName;
  status?: LeadStatus;
  minScore?: number;
  maxScore?: number;
  keyword?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'lead_score' | 'discovered_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Platform display configuration
export const PLATFORM_CONFIG: Record<PlatformName, { label: string; color: string; icon: string }> = {
  reddit: { label: 'Reddit', color: '#FF4500', icon: 'MessageCircle' },
  fiverr: { label: 'Fiverr', color: '#1DBF73', icon: 'Briefcase' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'Facebook' },
  gozambiajobs: { label: 'GoZambiaJobs', color: '#2563EB', icon: 'Building' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'Linkedin' },
  twitter: { label: 'Twitter/X', color: '#000000', icon: 'Twitter' },
  other: { label: 'Other', color: '#6B7280', icon: 'Globe' },
};

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: '#3B82F6', bgColor: '#EFF6FF' },
  contacted: { label: 'Contacted', color: '#F59E0B', bgColor: '#FFFBEB' },
  responded: { label: 'Responded', color: '#8B5CF6', bgColor: '#F5F3FF' },
  qualified: { label: 'Qualified', color: '#10B981', bgColor: '#ECFDF5' },
  closed: { label: 'Closed', color: '#6B7280', bgColor: '#F9FAFB' },
  archived: { label: 'Archived', color: '#9CA3AF', bgColor: '#F3F4F6' },
};

export function getScoreBucket(score: number): ScoreBucket {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'mild';
  return 'cold';
}

export const SCORE_COLORS: Record<ScoreBucket, string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  mild: '#3B82F6',
  cold: '#9CA3AF',
};
