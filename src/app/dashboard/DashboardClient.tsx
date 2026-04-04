'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import VisitCard from '@/components/VisitCard';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { TAGS, TAG_COLORS } from '@/lib/tags';

interface Visit {
  id: string;
  visitDate: string;
  doctorName: string;
  hospital: string;
  reason: string;
  notes: string;
  tags?: string[];
  followUpDate: string | null;
  followUpNote: string;
  memberId: string | null;
  memberName: string | null;
  prescriptionCount: number;
  reportCount: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

function DashboardInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const memberFilter = searchParams.get('member');

  const [visits, setVisits] = useState<Visit[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAll = () => {
    Promise.all([
      fetch('/api/visits').then(r => r.json()),
      fetch('/api/family').then(r => r.json()),
    ]).then(([vData, fData]) => {
      setVisits(vData.visits || []);
      setFamilyMembers(fData.members || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Upcoming follow-ups (next 30 days)
  const upcomingFollowUps = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return visits.filter(v => {
      if (!v.followUpDate) return false;
      const d = new Date(v.followUpDate);
      return d >= now && d <= in30;
    }).sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());
  }, [visits]);

  // Overdue follow-ups
  const overdueFollowUps = useMemo(() => {
    const now = new Date();
    return visits.filter(v => v.followUpDate && new Date(v.followUpDate) < now);
  }, [visits]);

  const usedTags = useMemo(() => {
    const used = new Set<string>();
    visits.forEach(v => v.tags?.forEach(t => used.add(t)));
    return TAGS.filter(t => used.has(t));
  }, [visits]);

  const filtered = useMemo(() => {
    let result = visits;
    if (memberFilter) result = result.filter(v => v.memberId === memberFilter);
    if (activeTag) result = result.filter(v => v.tags?.includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.doctorName.toLowerCase().includes(q) ||
        v.hospital.toLowerCase().includes(q) ||
        v.reason.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q) ||
        v.tags?.some(t => t.toLowerCase().includes(q)) ||
        v.memberName?.toLowerCase().includes(q) ||
        new Date(v.visitDate).toLocaleDateString().includes(q)
      );
    }
    return result;
  }, [visits, search, activeTag, memberFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(v => v.id)));
  const clearSelect = () => { setSelected(new Set()); setBulkMode(false); };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} visit${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/visits/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error('Delete failed');
      const { deleted } = await res.json();
      toast(`Deleted ${deleted} visit${deleted > 1 ? 's' : ''}`, 'success');
      clearSelect();
      fetchAll();
    } catch {
      toast('Failed to delete visits', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (visitId?: string) => {
    setExporting(true);
    const url = visitId ? `/api/visits/export?visitId=${visitId}` : '/api/visits/export';
    const win = window.open(url, '_blank');
    if (!win) toast('Allow pop-ups to export PDF', 'error');
    setExporting(false);
  };

  const activeMember = memberFilter ? familyMembers.find(m => m.id === memberFilter) : null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
      {/* Follow-up banners */}
      {overdueFollowUps.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">Overdue follow-up{overdueFollowUps.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">
              {overdueFollowUps.slice(0, 2).map(v => `${v.reason} (${new Date(v.followUpDate!).toLocaleDateString()})`).join(' · ')}
              {overdueFollowUps.length > 2 && ` +${overdueFollowUps.length - 2} more`}
            </p>
          </div>
        </div>
      )}
      {upcomingFollowUps.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-700">Upcoming follow-up{upcomingFollowUps.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {upcomingFollowUps.slice(0, 2).map(v => `${v.reason} on ${new Date(v.followUpDate!).toLocaleDateString()}`).join(' · ')}
              {upcomingFollowUps.length > 2 && ` +${upcomingFollowUps.length - 2} more`}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl text-slate-800">
            {activeMember ? `${activeMember.name}'s Visits` : 'Medical Visits'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'} on record
            {activeMember && <Link href="/dashboard" className="ml-2 text-brand-600 hover:text-brand-700">· View all</Link>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${bulkMode ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
          <Link
            href="/visits/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Visit
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-200">
          <span className="text-sm text-slate-600 font-medium">{selected.size} selected</span>
          <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Select all ({filtered.length})</button>
          <button onClick={clearSelect} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={selected.size === 0 || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              {deleting ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
              Delete {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      )}

      {visits.length > 0 && (
        <>
          {/* Family member filter */}
          {familyMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <Link href="/dashboard" className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${!memberFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                Everyone
              </Link>
              {familyMembers.map(m => (
                <Link key={m.id} href={`/dashboard?member=${m.id}`} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${memberFilter === m.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {m.name}
                </Link>
              ))}
            </div>
          )}

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
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Tag filter */}
          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setActiveTag(null)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${activeTag === null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                All
              </button>
              {usedTags.map(tag => {
                const colors = TAG_COLORS[tag] || 'bg-slate-50 text-slate-600 border-slate-200';
                return (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${activeTag === tag ? `${colors} ring-1 ring-offset-1 ring-current` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'}`}>
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
          <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">Start tracking your medical history by recording your first visit.</p>
          <Link href="/visits/new" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
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
          <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((visit) => (
            <div key={visit.id} className={`stagger-item relative ${bulkMode ? 'cursor-pointer' : ''}`} onClick={bulkMode ? () => toggleSelect(visit.id) : undefined}>
              {bulkMode && (
                <div className={`absolute top-3 right-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected.has(visit.id) ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}>
                  {selected.has(visit.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                </div>
              )}
              <div className={bulkMode ? 'pointer-events-none' : ''}>
                <VisitCard {...visit} onExport={!bulkMode ? () => handleExport(visit.id) : undefined} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardClient() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
