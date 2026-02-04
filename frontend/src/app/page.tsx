'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/ui/AppShell';
import StatCard from '@/components/dashboard/StatCard';
import ScoreChart from '@/components/dashboard/ScoreChart';
import PlatformBreakdown from '@/components/dashboard/PlatformBreakdown';
import RecentLeads from '@/components/dashboard/RecentLeads';
import { supabase } from '@/lib/supabase';
import type { DashboardSummary, PlatformStats, ScoreDistribution, Lead } from '@/lib/types';
import { Users, UserPlus, Target, TrendingUp, Activity, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [scoreDist, setScoreDist] = useState<ScoreDistribution[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [summaryRes, platformRes, scoreRes, leadsRes] = await Promise.all([
          supabase.from('v_dashboard_summary').select('*').single(),
          supabase.from('v_platform_stats').select('*'),
          supabase.from('v_score_distribution').select('*'),
          supabase
            .from('leads')
            .select('*')
            .order('discovered_at', { ascending: false })
            .limit(8),
        ]);

        if (summaryRes.data) setSummary(summaryRes.data);
        if (platformRes.data) setPlatforms(platformRes.data);
        if (scoreRes.data) setScoreDist(scoreRes.data);
        if (leadsRes.data) setRecentLeads(leadsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const s = summary || {
    leads_today: 0, leads_this_week: 0, leads_new: 0, leads_contacted: 0,
    leads_responded: 0, leads_qualified: 0, leads_closed: 0, leads_total: 0,
    avg_score: 0, max_score: 0,
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Lead generation overview for D-Media
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Leads Today"
          value={s.leads_today}
          icon={UserPlus}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          label="This Week"
          value={s.leads_this_week}
          icon={Activity}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          label="New Leads"
          value={s.leads_new}
          icon={Users}
          iconColor="text-brand-600 dark:text-brand-400"
          iconBg="bg-brand-50 dark:bg-brand-950/30"
        />
        <StatCard
          label="Contacted"
          value={s.leads_contacted}
          icon={Target}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30"
        />
        <StatCard
          label="Avg Score"
          value={s.avg_score || 0}
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-950/30"
        />
        <StatCard
          label="Total Leads"
          value={s.leads_total}
          icon={Clock}
          iconColor="text-gray-600 dark:text-gray-400"
          iconBg="bg-gray-50 dark:bg-gray-800/50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ScoreChart data={scoreDist} />
        <PlatformBreakdown data={platforms} />
      </div>

      {/* Recent leads */}
      <RecentLeads leads={recentLeads} />
    </AppShell>
  );
}
