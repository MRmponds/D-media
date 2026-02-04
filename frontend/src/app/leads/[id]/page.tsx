'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/ui/AppShell';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadStatus } from '@/lib/types';
import { PLATFORM_CONFIG, STATUS_CONFIG, getScoreBucket, SCORE_COLORS } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  ArrowLeft, ExternalLink, Copy, Check, MessageSquare,
  Calendar, Tag, User, Globe, FileText, Brain, Mail,
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function fetchLead() {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch lead:', error);
        return;
      }
      setLead(data);
      setNotes(data.notes || '');
      setLoading(false);
    }

    if (params.id) fetchLead();
  }, [params.id]);

  async function updateStatus(newStatus: LeadStatus) {
    if (!lead) return;
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    if (!error) setLead({ ...lead, status: newStatus });
  }

  async function saveNotes() {
    if (!lead) return;
    const { error } = await supabase.from('leads').update({ notes }).eq('id', lead.id);
    if (!error) setLead({ ...lead, notes });
  }

  function copyOutreach() {
    if (!lead?.suggested_outreach) return;
    navigator.clipboard.writeText(lead.suggested_outreach);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!lead) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)]">Lead not found.</p>
          <button onClick={() => router.push('/leads')} className="btn-primary mt-4">
            Back to Leads
          </button>
        </div>
      </AppShell>
    );
  }

  const platform = PLATFORM_CONFIG[lead.platform];
  const bucket = getScoreBucket(lead.lead_score);

  return (
    <AppShell>
      {/* Back button & header */}
      <div className="mb-6">
        <button onClick={() => router.push('/leads')} className="btn-ghost mb-4 -ml-3">
          <ArrowLeft size={16} />
          Back to Leads
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {lead.username || lead.business_name || 'Unknown Lead'}
              </h1>
              <span
                className="badge text-sm"
                style={{ backgroundColor: platform.color + '18', color: platform.color }}
              >
                {platform.label}
              </span>
            </div>
            {lead.post_title && (
              <p className="text-sm text-[var(--text-secondary)]">{lead.post_title}</p>
            )}
          </div>

          {/* Score badge */}
          <div
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl score-${bucket}`}
          >
            <span className="text-2xl font-bold">{lead.lead_score}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-75">score</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original post */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[var(--text-tertiary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Original Post</h2>
              {lead.source_url && (
                <a
                  href={lead.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  View original <ExternalLink size={12} />
                </a>
              )}
            </div>
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {lead.post_content}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-purple-500" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Analysis</h2>
            </div>

            {lead.detected_problem && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Detected Problem</p>
                <p className="text-sm text-[var(--text-secondary)]">{lead.detected_problem}</p>
              </div>
            )}

            {lead.ai_summary && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1.5">AI Summary</p>
                <p className="text-sm text-[var(--text-secondary)]">{lead.ai_summary}</p>
              </div>
            )}

            {lead.score_reasoning && (
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Score Reasoning</p>
                <p className="text-sm text-[var(--text-secondary)]">{lead.score_reasoning}</p>
              </div>
            )}

            {!lead.detected_problem && !lead.ai_summary && !lead.score_reasoning && (
              <p className="text-sm text-[var(--text-tertiary)]">No AI analysis available for this lead.</p>
            )}
          </div>

          {/* Suggested outreach */}
          {lead.suggested_outreach && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-green-500" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Suggested Outreach
                  </h2>
                </div>
                <button onClick={copyOutreach} className="btn-secondary text-xs py-1.5 px-3">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-4 rounded-lg bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {lead.suggested_outreach}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-[var(--text-tertiary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              className="input-field min-h-[100px] resize-y"
            />
            <div className="flex justify-end mt-3">
              <button onClick={saveNotes} className="btn-primary text-sm py-1.5">
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Metadata */}
        <div className="space-y-6">
          {/* Status controls */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                    ${lead.status === key
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 dark:border-brand-700'
                      : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Lead details */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Details</h3>
            <div className="space-y-3">
              <DetailRow icon={Globe} label="Platform" value={platform.label} />
              <DetailRow icon={User} label="Username" value={lead.username || 'N/A'} />
              {lead.business_name && (
                <DetailRow icon={User} label="Business" value={lead.business_name} />
              )}
              {lead.contact_method && (
                <DetailRow icon={Mail} label="Contact" value={`${lead.contact_method}: ${lead.contact_value}`} />
              )}
              <DetailRow icon={Calendar} label="Discovered" value={formatDateTime(lead.discovered_at)} />
              {lead.post_date && (
                <DetailRow icon={Calendar} label="Posted" value={formatDateTime(lead.post_date)} />
              )}
              {lead.contacted_at && (
                <DetailRow icon={Calendar} label="Contacted" value={formatDateTime(lead.contacted_at)} />
              )}
            </div>
          </div>

          {/* Matched keywords */}
          {lead.matched_keywords.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Matched Keywords ({lead.matched_keywords.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.matched_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="badge bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    <Tag size={10} className="mr-1" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{value}</p>
      </div>
    </div>
  );
}
