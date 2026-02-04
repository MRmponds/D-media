'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { LeadFilters as FiltersType, PlatformName, LeadStatus } from '@/lib/types';
import { PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/types';

interface LeadFiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
  totalResults: number;
}

export default function LeadFilters({ filters, onChange, totalResults }: LeadFiltersProps) {
  const hasActiveFilters = filters.platform || filters.status || filters.minScore || filters.search;

  function clearFilters() {
    onChange({ sortBy: 'discovered_at', sortOrder: 'desc', page: 1, pageSize: 25 });
  }

  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search leads by content, username, or problem..."
            className="input-field pl-9"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>

        {/* Platform filter */}
        <select
          className="input-field w-auto min-w-[140px]"
          value={filters.platform || ''}
          onChange={(e) => onChange({ ...filters, platform: (e.target.value || undefined) as PlatformName | undefined, page: 1 })}
        >
          <option value="">All Platforms</option>
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="input-field w-auto min-w-[130px]"
          value={filters.status || ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as LeadStatus | undefined, page: 1 })}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        {/* Min score */}
        <select
          className="input-field w-auto min-w-[130px]"
          value={filters.minScore || ''}
          onChange={(e) => onChange({ ...filters, minScore: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        >
          <option value="">Any Score</option>
          <option value="80">Hot (80+)</option>
          <option value="60">Warm (60+)</option>
          <option value="40">Mild (40+)</option>
        </select>

        {/* Sort */}
        <select
          className="input-field w-auto min-w-[150px]"
          value={`${filters.sortBy || 'discovered_at'}-${filters.sortOrder || 'desc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [FiltersType['sortBy'], FiltersType['sortOrder']];
            onChange({ ...filters, sortBy, sortOrder });
          }}
        >
          <option value="discovered_at-desc">Newest First</option>
          <option value="discovered_at-asc">Oldest First</option>
          <option value="lead_score-desc">Highest Score</option>
          <option value="lead_score-asc">Lowest Score</option>
          <option value="updated_at-desc">Recently Updated</option>
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-ghost text-red-500 hover:text-red-600">
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-primary)]">
        <SlidersHorizontal size={14} className="text-[var(--text-tertiary)]" />
        <span className="text-xs text-[var(--text-tertiary)]">
          {totalResults} lead{totalResults !== 1 ? 's' : ''} found
        </span>
      </div>
    </div>
  );
}
