'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import TagSelector from '@/components/TagSelector';
import { TagBadges } from '@/components/TagSelector';
import FileList from '@/components/FileList';
import { DetailSkeleton } from '@/components/ui/Skeletons';
import { ToastProvider, useToast } from '@/components/ui/Toast';

interface Visit {
  id: string;
  visitDate: string;
  doctorName: string;
  hospital: string;
  reason: string;
  notes: string;
  tags: string[];
  followUpDate: string | null;
  followUpNote: string;
  memberName: string | null;
}

interface MedFile {
  id: string;
  originalName: string;
  storageKey: string;
  viewUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// ── Edit form sub-component ──────────────────────────────────
function EditVisitForm({
  visit,
  onSaved,
  onCancel,
}: {
  visit: Visit;
  onSaved: (v: Visit) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    visitDate: visit.visitDate.slice(0, 10),
    doctorName: visit.doctorName,
    hospital: visit.hospital,
    reason: visit.reason,
    notes: visit.notes,
    tags: visit.tags || [],
    followUpDate: visit.followUpDate ? visit.followUpDate.slice(0, 10) : '',
    followUpNote: visit.followUpNote || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.visitDate) errs.visitDate = 'Visit date is required';
    if (!form.doctorName.trim()) errs.doctorName = 'Doctor name is required';
    if (!form.hospital.trim()) errs.hospital = 'Hospital / clinic is required';
    if (!form.reason.trim()) errs.reason = 'Reason is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDate: new Date(form.visitDate).toISOString(),
          doctorName: form.doctorName.trim(),
          hospital: form.hospital.trim(),
          reason: form.reason.trim(),
          notes: form.notes,
          tags: form.tags,
          followUpDate: form.followUpDate || null,
          followUpNote: form.followUpNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      const { visit: updated } = await res.json();
      toast('Visit updated successfully', 'success');
      onSaved(updated);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (field: string) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors bg-white
     ${errors[field] ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-brand-400'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Visit Date *</label>
        <input
          type="date"
          value={form.visitDate}
          onChange={(e) => update('visitDate', e.target.value)}
          className={fieldClass('visitDate')}
          max={new Date().toISOString().split('T')[0]}
        />
        {errors.visitDate && <p className="text-xs text-red-500 mt-1">{errors.visitDate}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Doctor *</label>
          <input
            type="text"
            value={form.doctorName}
            onChange={(e) => update('doctorName', e.target.value)}
            className={fieldClass('doctorName')}
          />
          {errors.doctorName && <p className="text-xs text-red-500 mt-1">{errors.doctorName}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hospital / Clinic *</label>
          <input
            type="text"
            value={form.hospital}
            onChange={(e) => update('hospital', e.target.value)}
            className={fieldClass('hospital')}
          />
          {errors.hospital && <p className="text-xs text-red-500 mt-1">{errors.hospital}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Visit *</label>
        <input
          type="text"
          value={form.reason}
          onChange={(e) => update('reason', e.target.value)}
          className={fieldClass('reason')}
        />
        {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className={`${fieldClass('notes')} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
        <TagSelector selected={form.tags} onChange={(tags) => setForm(prev => ({ ...prev, tags }))} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Follow-up date</label>
          <input type="date" value={form.followUpDate} onChange={e => setForm(prev => ({ ...prev, followUpDate: e.target.value }))} className={fieldClass('followUpDate')} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Follow-up note</label>
          <input type="text" value={form.followUpNote} onChange={e => setForm(prev => ({ ...prev, followUpNote: e.target.value }))} placeholder="Review results, second opinion…" className={fieldClass('followUpNote')} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Save Changes
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main inner component ─────────────────────────────────────
function VisitDetailInner({ visitId }: { visitId: string }) {
  const { toast } = useToast();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [prescriptions, setPrescriptions] = useState<MedFile[]>([]);
  const [reports, setReports] = useState<MedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchVisit = async () => {
    try {
      const res = await fetch(`/api/visits/${visitId}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      setVisit(data.visit);
      setPrescriptions(data.prescriptions || []);
      setReports(data.reports || []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisit(); }, [visitId]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !visit) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="font-display text-xl text-slate-600 mb-2">Visit not found</h2>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:text-brand-700 font-medium">← Back to Dashboard</Link>
      </div>
    );
  }

  const date = new Date(visit.visitDate);
  const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/dashboard" className="hover:text-brand-600 transition-colors">Dashboard</Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-600 font-medium truncate max-w-[200px]">{visit.reason}</span>
      </div>

      {/* Visit info card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-display text-xl lg:text-2xl text-slate-800 mb-1">{visit.reason}</h1>
            <p className="text-sm text-slate-400">{formattedDate}</p>
          </div>
          {/* Edit / Editable badge */}
          {editing ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
              <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Editing
            </span>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
            >
              <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit Visit
            </button>
          )}
        </div>

        {editing ? (
          /* ── Inline edit form ── */
          <EditVisitForm
            visit={visit}
            onSaved={(updated) => {
              setVisit(updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          /* ── Read-only view ── */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Doctor</p>
                  <p className="text-sm font-medium text-slate-700">{visit.doctorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Hospital / Clinic</p>
                  <p className="text-sm font-medium text-slate-700">{visit.hospital}</p>
                </div>
              </div>
            </div>

            {visit.notes && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{visit.notes}</p>
              </div>
            )}
            {visit.tags && visit.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tags</p>
                <TagBadges tags={visit.tags} />
              </div>
            )}
            {visit.followUpDate && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Follow-up</p>
                <p className={`text-sm font-medium ${new Date(visit.followUpDate) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
                  {new Date(visit.followUpDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {new Date(visit.followUpDate) < new Date() && ' — Overdue'}
                </p>
                {visit.followUpNote && <p className="text-sm text-slate-500 mt-1">{visit.followUpNote}</p>}
              </div>
            )}
            {visit.memberName && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Family member</p>
                <p className="text-sm font-medium text-slate-700">{visit.memberName}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* File sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prescriptions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-base text-slate-800">Prescriptions</h2>
              <p className="text-xs text-slate-400">{prescriptions.length} file{prescriptions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <FileUpload
            visitId={visitId}
            category="prescription"
            onUploaded={fetchVisit}
            onError={(msg) => toast(msg, 'error')}
            onSuccess={(msg) => toast(msg, 'success')}
          />
          <div className="mt-3">
            <FileList
              files={prescriptions}
              visitId={visitId}
              onDeleted={fetchVisit}
              onError={(msg) => toast(msg, 'error')}
              onSuccess={(msg) => toast(msg, 'success')}
            />
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-base text-slate-800">Medical Reports</h2>
              <p className="text-xs text-slate-400">{reports.length} file{reports.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <FileUpload
            visitId={visitId}
            category="report"
            onUploaded={fetchVisit}
            onError={(msg) => toast(msg, 'error')}
            onSuccess={(msg) => toast(msg, 'success')}
          />
          <div className="mt-3">
            <FileList
              files={reports}
              visitId={visitId}
              onDeleted={fetchVisit}
              onError={(msg) => toast(msg, 'error')}
              onSuccess={(msg) => toast(msg, 'success')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Wrapper with toast provider ──────────────────────────────
export default function VisitDetailClient({ visitId }: { visitId: string }) {
  return (
    <ToastProvider>
      <VisitDetailInner visitId={visitId} />
    </ToastProvider>
  );
}
