'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/ui/AppShell';
import LeadFilters from '@/components/leads/LeadFilters';
import LeadTable from '@/components/leads/LeadTable';
import Pagination from '@/components/leads/Pagination';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadFilters as FiltersType, LeadStatus } from '@/lib/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersType>({
    sortBy: 'discovered_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 25,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('leads').select('*', { count: 'exact' });

      // Apply filters
      if (filters.platform) query = query.eq('platform', filters.platform);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.minScore) query = query.gte('lead_score', filters.minScore);
      if (filters.maxScore) query = query.lte('lead_score', filters.maxScore);
      if (filters.search) {
        query = query.or(
          `post_content.ilike.%${filters.search}%,username.ilike.%${filters.search}%,detected_problem.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`
        );
      }
      if (filters.dateFrom) query = query.gte('discovered_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('discovered_at', filters.dateTo);

      // Sorting
      const sortBy = filters.sortBy || 'discovered_at';
      const sortOrder = filters.sortOrder === 'asc';
      query = query.order(sortBy, { ascending: sortOrder });

      // Pagination
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 25;
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      setLeads(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leads</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage and track discovered leads across all platforms
          </p>
        </div>
        <button onClick={fetchLeads} className="btn-secondary" disabled={loading}>
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Filters */}
      <LeadFilters filters={filters} onChange={setFilters} totalResults={total} />

      {/* Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading leads...</p>
          </div>
        </div>
      ) : (
        <>
          <LeadTable leads={leads} onStatusChange={handleStatusChange} />
          <Pagination
            page={filters.page || 1}
            pageSize={filters.pageSize || 25}
            total={total}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}
    </AppShell>
  );
}
