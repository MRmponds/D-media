'use client';

import Link from 'next/link';
import type { Lead, LeadStatus } from '@/lib/types';
import { PLATFORM_CONFIG, STATUS_CONFIG, getScoreBucket } from '@/lib/types';
import { timeAgo, truncate } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LeadTableProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export default function LeadTable({ leads, onStatusChange }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[var(--text-secondary)]">No leads match your filters.</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    if (!error) onStatusChange(leadId, newStatus);
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-16">Score</th>
              <th className="table-header">Lead</th>
              <th className="table-header w-28">Platform</th>
              <th className="table-header w-32">Status</th>
              <th className="table-header w-24">Discovered</th>
              <th className="table-header w-10"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const platform = PLATFORM_CONFIG[lead.platform];
              const bucket = getScoreBucket(lead.lead_score);

              return (
                <tr key={lead.id} className="group hover:bg-[var(--bg-card-hover)] transition-colors">
                  {/* Score */}
                  <td className="table-cell">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold score-${bucket}`}>
                      {lead.lead_score}
                    </div>
                  </td>

                  {/* Lead info */}
                  <td className="table-cell">
                    <Link href={`/leads/${lead.id}`} className="block group-hover:text-brand-600 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {lead.username || lead.business_name || 'Unknown'}
                        </span>
                        {lead.post_title && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            - {truncate(lead.post_title, 50)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                        {truncate(lead.detected_problem || lead.post_content, 120)}
                      </p>
                      {lead.matched_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {lead.matched_keywords.slice(0, 3).map((kw) => (
                            <span
                              key={kw}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                                bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                            >
                              {kw}
                            </span>
                          ))}
                          {lead.matched_keywords.length > 3 && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              +{lead.matched_keywords.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  </td>

                  {/* Platform */}
                  <td className="table-cell">
                    <span
                      className="badge"
                      style={{ backgroundColor: platform.color + '18', color: platform.color }}
                    >
                      {platform.label}
                    </span>
                  </td>

                  {/* Status (editable) */}
                  <td className="table-cell">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer
                        bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
                        focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Date */}
                  <td className="table-cell text-xs text-[var(--text-tertiary)]">
                    {timeAgo(lead.discovered_at)}
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {lead.source_url && (
                        <a
                          href={lead.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                          title="View original post"
                        >
                          <ExternalLink size={14} className="text-[var(--text-tertiary)]" />
                        </a>
                      )}
                      <Link
                        href={`/leads/${lead.id}`}
                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
