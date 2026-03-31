'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function VisitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    doctorName: '',
    hospital: '',
    reason: '',
    notes: '',
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.visitDate || !form.doctorName || !form.hospital || !form.reason) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create visit');
      }

      const data = await res.json();
      router.push(`/visits/${data.visit.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
  const labelClass = 'block text-sm font-medium text-slate-600 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Visit Date <span className="text-red-400">*</span></label>
          <input type="date" value={form.visitDate} onChange={(e) => update('visitDate', e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Doctor Name <span className="text-red-400">*</span></label>
          <input type="text" value={form.doctorName} onChange={(e) => update('doctorName', e.target.value)} placeholder="Dr. Jane Smith" className={inputClass} required />
        </div>
      </div>

      <div>
        <label className={labelClass}>Hospital / Clinic <span className="text-red-400">*</span></label>
        <input type="text" value={form.hospital} onChange={(e) => update('hospital', e.target.value)} placeholder="Mount Sinai Hospital" className={inputClass} required />
      </div>

      <div>
        <label className={labelClass}>Reason for Visit <span className="text-red-400">*</span></label>
        <input type="text" value={form.reason} onChange={(e) => update('reason', e.target.value)} placeholder="Annual checkup, follow-up, etc." className={inputClass} required />
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional details about the visit…"
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Creating…' : 'Create Visit'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
