'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import VisitCard from '@/components/VisitCard';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { ToastProvider } from '@/components/ui/Toast';
import { TAGS, TAG_COLORS } from '@/lib/tags';

interface Visit {
  id: string;
  visitDate: string;
  doctorName: string;
  hospital: string;
  reason: string;
  notes: string;
  tags: string[];
  prescriptionCount: number;
  reportCount: number;
}

export default function DashboardClient() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/visits')
      .then((r) => r.json())
      .then((data) => setVisits(data.visits || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Only show tags that are actually used
  const usedTags = useMemo(() => {
    const used = new Set<string>();
    visits.forEach(v => v.tags?.forEach(t => used.add(t)));
    return TAGS.filter(t => used.has(t));
  }, [visits]);

  const filtered = useMemo(() => {
    let result = visits;
    if (activeTag) {
      result = result.filter(v => v.tags?.includes(activeTag));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.doctorName.toLowerCase().includes(q) ||
          v.hospital.toLowerCase().includes(q) ||
          v.reason.toLowerCase().includes(q) ||
          v.notes.toLowerCase().includes(q) ||
          v.tags?.some(t => t.toLowerCase().includes(q)) ||
          new Date(v.visitDate).toLocaleDateString().includes(q)
      );
    }
    return result;
  }, [visits, search, activeTag]);

  return (
    <ToastProvider>
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-slate-800">Medical Visits</h1>
            <p className="text-sm text-slate-400 mt-1">
              {visits.length} {visits.length === 1 ? 'visit' : 'visits'} on record
            </p>
          </div>
          <Link
            href="/visits/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Visit
          </Link>
        </div>

        {visits.length > 0 && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by doctor, hospital, reason, tag…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Tag filter pills */}
            {usedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    activeTag === null
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  All
                </button>
                {usedTags.map(tag => {
                  const colors = TAG_COLORS[tag] || 'bg-slate-50 text-slate-600 border-slate-200';
                  const isActive = activeTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(isActive ? null : tag)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        isActive ? `${colors} ring-1 ring-offset-1 ring-current` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Content */}
        {loading ? (
          <DashboardSkeleton />
        ) : visits.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-brand-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-slate-700 mb-2">No visits yet</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
              Start tracking your medical history by recording your first visit.
            </p>
            <Link
              href="/visits/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Your First Visit
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h2 className="font-display text-lg text-slate-600 mb-1">No matching visits</h2>
            <p className="text-sm text-slate-400">Try adjusting your search or tag filter</p>
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">
                Clear tag filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((visit) => (
              <div key={visit.id} className="stagger-item">
                <VisitCard {...visit} />
              </div>
            ))}
          </div>
        )}
      </div>
    </ToastProvider>
  );
}