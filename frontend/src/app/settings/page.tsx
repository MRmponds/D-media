'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/ui/AppShell';
import { supabase } from '@/lib/supabase';
import type { Keyword, Platform } from '@/lib/types';
import { PLATFORM_CONFIG } from '@/lib/types';
import { Save, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('pain_signal');
  const [newWeight, setNewWeight] = useState('1.50');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'keywords' | 'platforms' | 'general'>('keywords');

  const fetchData = useCallback(async () => {
    const [kwRes, pRes, sRes] = await Promise.all([
      supabase.from('keywords').select('*').order('weight', { ascending: false }),
      supabase.from('platforms').select('*').order('name'),
      supabase.from('settings').select('*'),
    ]);

    if (kwRes.data) setKeywords(kwRes.data);
    if (pRes.data) setPlatforms(pRes.data);
    if (sRes.data) {
      const map: Record<string, unknown> = {};
      sRes.data.forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    const { data, error } = await supabase
      .from('keywords')
      .insert({ phrase: newKeyword.trim().toLowerCase(), category: newCategory, weight: parseFloat(newWeight) })
      .select()
      .single();
    if (data) {
      setKeywords([data, ...keywords]);
      setNewKeyword('');
    }
    if (error) alert(`Error: ${error.message}`);
  }

  async function deleteKeyword(id: string) {
    await supabase.from('keywords').delete().eq('id', id);
    setKeywords(keywords.filter((k) => k.id !== id));
  }

  async function toggleKeyword(id: string, enabled: boolean) {
    await supabase.from('keywords').update({ enabled: !enabled }).eq('id', id);
    setKeywords(keywords.map((k) => (k.id === id ? { ...k, enabled: !k.enabled } : k)));
  }

  async function togglePlatform(id: string, enabled: boolean) {
    await supabase.from('platforms').update({ enabled: !enabled }).eq('id', id);
    setPlatforms(platforms.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    await supabase.from('settings').upsert({ key, value: JSON.parse(JSON.stringify(value)) });
    setSettings({ ...settings, [key]: value });
    setSaving(false);
  }

  const TABS = [
    { id: 'keywords' as const, label: 'Keywords' },
    { id: 'platforms' as const, label: 'Platforms' },
    { id: 'general' as const, label: 'General' },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure keywords, platforms, and system behavior
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-primary)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Keywords tab */}
      {tab === 'keywords' && (
        <div className="space-y-4">
          {/* Add new keyword */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Add Keyword</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Enter keyword phrase..."
                className="input-field flex-1 min-w-[200px]"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              />
              <select
                className="input-field w-auto"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="pain_signal">Pain Signal</option>
                <option value="hiring">Hiring</option>
                <option value="request">Request</option>
                <option value="complaint">Complaint</option>
                <option value="general">General</option>
              </select>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="3.0"
                className="input-field w-20"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
              />
              <button onClick={addKeyword} className="btn-primary">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Keywords list */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Phrase</th>
                  <th className="table-header w-28">Category</th>
                  <th className="table-header w-20">Weight</th>
                  <th className="table-header w-20">Matches</th>
                  <th className="table-header w-20">Status</th>
                  <th className="table-header w-16"></th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) => (
                  <tr key={kw.id} className="hover:bg-[var(--bg-card-hover)]">
                    <td className="table-cell font-medium text-[var(--text-primary)]">{kw.phrase}</td>
                    <td className="table-cell">
                      <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        {kw.category}
                      </span>
                    </td>
                    <td className="table-cell font-mono text-xs">{kw.weight.toFixed(2)}</td>
                    <td className="table-cell text-xs">{kw.match_count}</td>
                    <td className="table-cell">
                      <button onClick={() => toggleKeyword(kw.id, kw.enabled)}>
                        {kw.enabled ? (
                          <ToggleRight size={22} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={22} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => deleteKeyword(kw.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platforms tab */}
      {tab === 'platforms' && (
        <div className="space-y-3">
          {platforms.map((p) => {
            const config = PLATFORM_CONFIG[p.name];
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: config?.color || '#6B7280' }}
                    >
                      {p.display_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {p.display_name}
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Rate limit: {p.rate_limit_per_hour}/hr
                        {p.last_scan_at && ` | Last scan: ${new Date(p.last_scan_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => togglePlatform(p.id, p.enabled)}>
                    {p.enabled ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* General settings tab */}
      {tab === 'general' && (
        <div className="space-y-4">
          <SettingCard
            label="Lead Score Threshold"
            description="Minimum score to surface leads in the dashboard (0-100)"
            value={settings.lead_score_threshold as string}
            type="number"
            onSave={(v) => saveSetting('lead_score_threshold', v)}
          />
          <SettingCard
            label="Daily Scan Time (UTC)"
            description="When to run the daily lead scan"
            value={settings.daily_scan_time as string}
            type="text"
            onSave={(v) => saveSetting('daily_scan_time', v)}
          />
          <SettingCard
            label="AI Model"
            description="OpenAI model for lead qualification"
            value={settings.ai_model as string}
            type="text"
            onSave={(v) => saveSetting('ai_model', v)}
          />
          <SettingCard
            label="AI Temperature"
            description="Lower = more consistent scoring (0.0 - 1.0)"
            value={settings.ai_temperature as string}
            type="number"
            onSave={(v) => saveSetting('ai_temperature', v)}
          />
          <SettingCard
            label="Max Leads Per Scan"
            description="Maximum leads to process per platform per scan"
            value={settings.max_leads_per_scan as string}
            type="number"
            onSave={(v) => saveSetting('max_leads_per_scan', v)}
          />
          <SettingCard
            label="Outreach Score Threshold"
            description="Minimum score for auto-generating outreach messages"
            value={settings.outreach_score_threshold as string}
            type="number"
            onSave={(v) => saveSetting('outreach_score_threshold', v)}
          />
          <SettingCard
            label="Notification Email"
            description="Email for daily scan reports (leave empty to disable)"
            value={settings.notification_email as string}
            type="email"
            onSave={(v) => saveSetting('notification_email', v)}
          />
        </div>
      )}
    </AppShell>
  );
}

function SettingCard({
  label,
  description,
  value,
  type,
  onSave,
}: {
  label: string;
  description: string;
  value: unknown;
  type: string;
  onSave: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value || '').replace(/^"|"$/g, ''));

  useEffect(() => {
    setLocalValue(String(value || '').replace(/^"|"$/g, ''));
  }, [value]);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type={type}
            className="input-field w-48"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
          />
          <button onClick={() => onSave(localValue)} className="btn-primary py-2 px-3">
            <Save size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
