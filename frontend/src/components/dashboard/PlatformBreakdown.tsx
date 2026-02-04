'use client';

import type { PlatformStats } from '@/lib/types';
import { PLATFORM_CONFIG } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface PlatformBreakdownProps {
  data: PlatformStats[];
}

export default function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Leads by Platform</h3>
        <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-tertiary)]">
          No data yet
        </div>
      </div>
    );
  }

  const chartData = data.map((p) => ({
    name: PLATFORM_CONFIG[p.platform]?.label || p.platform,
    leads: p.total_leads,
    today: p.today,
    color: PLATFORM_CONFIG[p.platform]?.color || '#6B7280',
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Leads by Platform</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value} leads`]}
          />
          <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
