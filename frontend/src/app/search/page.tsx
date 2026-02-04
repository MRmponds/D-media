'use client';

import { useRef, useState } from 'react';
import SearchForm, { SearchParams } from '@/components/search/SearchForm';
import ActionButtons from '@/components/search/ActionButtons';
import ResultsTable, { LeadResult } from '@/components/search/ResultsTable';

export default function SearchPage() {
  const searchParamsRef = useRef<SearchParams>({
    industry: '',
    businessSize: 'any',
    location: '',
    problemSignals: ['no_leads', 'bad_ads'],
    customSignals: '',
  });
  const [results, setResults] = useState<LeadResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleParamsChange(params: SearchParams) {
    searchParamsRef.current = params;
  }

  async function callWebhook(action: string) {

    setLoading(action);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          params: searchParamsRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (action === 'find' || action === 'scrape') {
        setResults(data.leads || []);
      } else if (action === 'analyze') {
        // Merge updated scores/analysis into existing results
        if (data.leads && data.leads.length > 0) {
          setResults(data.leads);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  function handleExport() {
    if (results.length === 0) return;

    const headers = [
      'Company', 'Industry', 'Location', 'Confidence Score', 'Urgency',
      'Detected Problem', 'Pain Summary', 'Outreach Suggestion',
      'Website', 'Source', 'Source URL', 'Found At',
    ];

    const rows = results.map((lead) => [
      lead.company_name,
      lead.industry,
      lead.location || '',
      lead.confidence_score.toString(),
      lead.urgency,
      lead.detected_problem,
      lead.pain_summary,
      lead.outreach_suggestion,
      lead.website || '',
      lead.source,
      lead.source_url || '',
      lead.found_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `d-media-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Find Clients
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          AI-powered lead discovery — define your ideal client and let the agent work
        </p>
      </div>

      {/* Search form */}
      <SearchForm onChange={handleParamsChange} loading={loading !== null} />

      {/* Action buttons */}
      <ActionButtons
        onFindClients={() => callWebhook('find')}
        onScrape={() => callWebhook('scrape')}
        onAnalyze={() => callWebhook('analyze')}
        onExport={handleExport}
        loading={loading}
        hasResults={results.length > 0}
      />

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      <ResultsTable results={results} loading={loading === 'find' || loading === 'scrape'} />
    </div>
  );
}
