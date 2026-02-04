'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ScoreDistribution } from '@/lib/types';

const COLORS: Record<string, string> = {
  'hot (80-100)': '#EF4444',
  'warm (60-79)': '#F59E0B',
  'mild (40-59)': '#3B82F6',
  'cold (0-39)': '#9CA3AF',
};

interface ScoreChartProps {
  data: ScoreDistribution[];
}

export default function ScoreChart({ data }: ScoreChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Score Distribution</h3>
        <div className="flex items-center justify-center h-[200px] text-sm text-[var(--text-tertiary)]">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Score Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="score_bucket"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.score_bucket} fill={COLORS[entry.score_bucket] || '#9CA3AF'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, _name: string, props: { payload?: ScoreDistribution }) => [
              `${value} leads (${props.payload?.percentage ?? 0}%)`,
              props.payload?.score_bucket ?? '',
            ]}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-[var(--text-secondary)]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
