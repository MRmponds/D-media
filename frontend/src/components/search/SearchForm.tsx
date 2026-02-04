'use client';

import { useState } from 'react';
import { Search, Building2, MapPin, AlertTriangle, ChevronDown } from 'lucide-react';

export interface SearchParams {
  industry: string;
  businessSize: string;
  location: string;
  problemSignals: string[];
  customSignals: string;
}

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const INDUSTRIES = [
  'Any Industry',
  'Logistics & Transport',
  'Real Estate',
  'Fintech & Finance',
  'Healthcare & Clinics',
  'E-commerce & Retail',
  'SaaS & Software',
  'Restaurants & Food',
  'Fitness & Wellness',
  'Education & Training',
  'Legal Services',
  'Construction',
  'Marketing & Advertising',
  'Consulting',
  'Beauty & Personal Care',
];

const BUSINESS_SIZES = [
  { value: 'any', label: 'Any Size' },
  { value: 'solo', label: 'Solo / Freelancer' },
  { value: 'small', label: 'Small (2-10)' },
  { value: 'sme', label: 'SME (10-50)' },
  { value: 'medium', label: 'Medium (50-200)' },
  { value: 'enterprise', label: 'Enterprise (200+)' },
];

const PROBLEM_SIGNALS = [
  { id: 'no_leads', label: 'No leads / No clients', icon: '🚫' },
  { id: 'low_conversions', label: 'Low conversions', icon: '📉' },
  { id: 'no_marketing', label: 'No marketing presence', icon: '👻' },
  { id: 'looking_for_clients', label: 'Actively looking for clients', icon: '🔍' },
  { id: 'bad_ads', label: 'Bad ads / Poor creatives', icon: '🎨' },
  { id: 'hiring_marketing', label: 'Hiring for marketing roles', icon: '💼' },
  { id: 'weak_branding', label: 'Weak branding / No website', icon: '🌐' },
  { id: 'competitor_complaints', label: 'Complaining about competitors', icon: '😤' },
];

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [industry, setIndustry] = useState('Any Industry');
  const [businessSize, setBusinessSize] = useState('any');
  const [location, setLocation] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<string[]>(['no_leads', 'bad_ads']);
  const [customSignals, setCustomSignals] = useState('');
  const [expanded, setExpanded] = useState(true);

  function toggleSignal(id: string) {
    setSelectedSignals((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      industry: industry === 'Any Industry' ? '' : industry,
      businessSize,
      location,
      problemSignals: selectedSignals,
      customSignals,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/30">
            <Search size={18} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Define Your Ideal Client
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Specify industry, location, and pain signals to find
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-[var(--border-primary)] pt-5">
          {/* Row 1: Industry + Size + Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                <Building2 size={13} /> Industry / Niche
              </label>
              <select
                className="input-field"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                <Building2 size={13} /> Business Size
              </label>
              <select
                className="input-field"
                value={businessSize}
                onChange={(e) => setBusinessSize(e.target.value)}
              >
                {BUSINESS_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                <MapPin size={13} /> Location
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Zambia, Lusaka, or Global"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Problem Signals */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2.5">
              <AlertTriangle size={13} /> Problem Signals to Detect
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PROBLEM_SIGNALS.map((signal) => (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => toggleSignal(signal.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left
                    ${selectedSignals.includes(signal.id)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 dark:border-brand-700'
                      : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  <span>{signal.icon}</span>
                  <span>{signal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom signals */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Custom Signals (optional)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder='e.g. "struggling to get customers", "need help with sales"'
              value={customSignals}
              onChange={(e) => setCustomSignals(e.target.value)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
