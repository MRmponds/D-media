'use client';

import { useState } from 'react';
import { ExternalLink, TrendingUp, MessageSquare, Globe, Briefcase, Mail, Phone, Copy, Check } from 'lucide-react';

export interface LeadResult {
  id: string;
  company_name: string;
  website: string | null;
  profile_url: string | null;
  industry: string;
  location: string | null;
  detected_problem: string;
  pain_summary: string;
  confidence_score: number;
  urgency: 'low' | 'medium' | 'high';
  outreach_suggestion: string;
  source: string;
  source_url: string | null;
  found_at: string;
  email: string | null;
  phone: string | null;
  company_website: string | null;
}

interface ResultsTableProps {
  results: LeadResult[];
  loading: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'score-hot';
  if (score >= 60) return 'score-warm';
  if (score >= 40) return 'score-mild';
  return 'score-cold';
}

function getUrgencyBadge(urgency: string) {
  const styles: Record<string, string> = {
    high: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  };
  return styles[urgency] || styles.low;
}

function getSourceIcon(source: string) {
  const lower = source.toLowerCase();
  if (lower.includes('reddit')) return '🟠';
  if (lower.includes('linkedin')) return '🔵';
  if (lower.includes('google')) return '🟢';
  if (lower.includes('facebook')) return '🔷';
  if (lower.includes('twitter') || lower.includes('x.com')) return '⚫';
  if (lower.includes('job')) return '💼';
  if (lower.includes('website')) return '🌐';
  return '📄';
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
        bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-primary)]
        transition-colors group"
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check size={11} className="text-green-600" />
      ) : (
        <Copy size={11} className="opacity-50 group-hover:opacity-100" />
      )}
      <span className="truncate max-w-[180px]">{text}</span>
    </button>
  );
}

export default function ResultsTable({ results, loading }: ResultsTableProps) {
  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-800 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              AI Agent is searching...
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Scanning sources, detecting pain signals, and qualifying leads
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Globe size={40} className="mx-auto text-[var(--text-tertiary)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">
          No results yet. Define your ideal client above and click &quot;Find Clients&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {results.length} Lead{results.length !== 1 ? 's' : ''} Found
        </h3>
        <p className="text-xs text-[var(--text-tertiary)]">
          Sorted by confidence score
        </p>
      </div>

      {results.map((lead) => {
        const hasContact = lead.email || lead.phone || lead.company_website;

        return (
          <div key={lead.id} className="card-hover p-5">
            <div className="flex items-start gap-4">
              {/* Score */}
              <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 ${getScoreColor(lead.confidence_score)}`}>
                <span className="text-lg font-bold">{lead.confidence_score}</span>
                <span className="text-[9px] font-medium uppercase tracking-wider opacity-70">score</span>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Company header */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {lead.company_name}
                  </h4>
                  <span className={`badge text-[10px] ${getUrgencyBadge(lead.urgency)}`}>
                    {lead.urgency.toUpperCase()} URGENCY
                  </span>
                  <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-[10px]">
                    {getSourceIcon(lead.source)} {lead.source}
                  </span>
                </div>

                {/* Industry + Location */}
                <div className="flex items-center gap-3 mb-2">
                  {lead.industry && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                      <Briefcase size={11} /> {lead.industry}
                    </span>
                  )}
                  {lead.location && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                      <Globe size={11} /> {lead.location}
                    </span>
                  )}
                </div>

                {/* Contact details */}
                {hasContact && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/30">
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={11} className="text-blue-600 dark:text-blue-400" />
                        <CopyButton text={lead.email} label="email" />
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-blue-600 dark:text-blue-400" />
                        <CopyButton text={lead.phone} label="phone" />
                      </div>
                    )}
                    {lead.company_website && (
                      <div className="flex items-center gap-1">
                        <Globe size={11} className="text-blue-600 dark:text-blue-400" />
                        <CopyButton text={lead.company_website} label="website" />
                      </div>
                    )}
                  </div>
                )}

                {/* Detected problem */}
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] mb-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">
                        Detected Problem
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {lead.pain_summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Outreach suggestion */}
                <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/30">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-green-800 dark:text-green-300">
                          Suggested Outreach
                        </p>
                        <CopyButton text={lead.outreach_suggestion} label="outreach message" />
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {lead.outreach_suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                {(lead.company_website || lead.website) && (
                  <a
                    href={lead.company_website || lead.website || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost p-2 text-xs"
                    title="Visit website"
                  >
                    <Globe size={14} />
                  </a>
                )}
                {lead.source_url && (
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost p-2 text-xs"
                    title="View source"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
