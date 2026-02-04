'use client';

import Link from 'next/link';
import type { Lead } from '@/lib/types';
import { PLATFORM_CONFIG, STATUS_CONFIG, getScoreBucket } from '@/lib/types';
import { timeAgo, truncate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface RecentLeadsProps {
  leads: Lead[];
}

export default function RecentLeads({ leads }: RecentLeadsProps) {
  if (!leads || leads.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Leads</h3>
        <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-tertiary)]">
          No leads discovered yet. Scans will populate this automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-5 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Leads</h3>
          <Link href="/leads" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
      </div>
      <div className="divide-y divide-[var(--border-primary)]">
        {leads.map((lead) => {
          const platform = PLATFORM_CONFIG[lead.platform];
          const status = STATUS_CONFIG[lead.status];
          const bucket = getScoreBucket(lead.lead_score);

          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              {/* Score */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold score-${bucket}`}
              >
                {lead.lead_score}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {lead.username || lead.business_name || 'Unknown'}
                  </span>
                  <span
                    className="badge"
                    style={{ backgroundColor: platform.color + '18', color: platform.color }}
                  >
                    {platform.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {truncate(lead.detected_problem || lead.post_content, 100)}
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="badge" style={{ backgroundColor: status.bgColor, color: status.color }}>
                  {status.label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(lead.discovered_at)}</span>
                <ExternalLink size={14} className="text-[var(--text-tertiary)]" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
