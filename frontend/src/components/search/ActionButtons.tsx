'use client';

import { Rocket, Database, Brain, Download, Loader2 } from 'lucide-react';

interface ActionButtonsProps {
  onFindClients: () => void;
  onScrape: () => void;
  onAnalyze: () => void;
  onExport: () => void;
  loading: string | null;  // Which action is loading, or null
  hasResults: boolean;
}

export default function ActionButtons({
  onFindClients,
  onScrape,
  onAnalyze,
  onExport,
  loading,
  hasResults,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onFindClients}
        disabled={loading !== null}
        className="btn-primary py-2.5 px-5 text-sm bg-gradient-to-r from-brand-600 to-brand-700
          hover:from-brand-700 hover:to-brand-800 shadow-lg shadow-brand-600/20"
      >
        {loading === 'find' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Rocket size={16} />
        )}
        {loading === 'find' ? 'Finding Clients...' : 'Find Clients'}
      </button>

      <button
        onClick={onScrape}
        disabled={loading !== null}
        className="btn-secondary py-2.5 px-4 text-sm"
      >
        {loading === 'scrape' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Database size={16} />
        )}
        {loading === 'scrape' ? 'Scraping...' : 'Scrape Sources'}
      </button>

      <button
        onClick={onAnalyze}
        disabled={loading !== null || !hasResults}
        className="btn-secondary py-2.5 px-4 text-sm"
      >
        {loading === 'analyze' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Brain size={16} />
        )}
        {loading === 'analyze' ? 'Analyzing...' : 'Analyze Leads'}
      </button>

      <button
        onClick={onExport}
        disabled={!hasResults}
        className="btn-secondary py-2.5 px-4 text-sm"
      >
        <Download size={16} />
        Export CSV
      </button>
    </div>
  );
}
