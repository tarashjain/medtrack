'use client';

import Link from 'next/link';

interface VisitCardProps {
  id: string;
  visitDate: string;
  doctorName: string;
  hospital: string;
  reason: string;
  notes: string;
  prescriptionCount: number;
  reportCount: number;
}

export default function VisitCard({
  id, visitDate, doctorName, hospital, reason, notes, prescriptionCount, reportCount,
}: VisitCardProps) {
  const date = new Date(visitDate);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const truncatedNotes = notes.length > 120 ? notes.slice(0, 120) + '…' : notes;

  return (
    <Link href={`/visits/${id}`} className="group block">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 transition-all duration-200 hover:shadow-lg hover:shadow-brand-100/50 hover:border-brand-200 hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {dayName}, {formattedDate}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-50 text-brand-600">
            {new Date(visitDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'Recent' : 'Past'}
          </span>
        </div>
        <h3 className="font-display text-base text-slate-800 mb-1 group-hover:text-brand-700 transition-colors leading-snug">{reason}</h3>
        <p className="text-sm text-slate-500 mb-2.5">
          <span className="font-medium text-slate-600">{doctorName}</span>
          <span className="mx-1.5 text-slate-300">·</span>{hospital}
        </p>
        {notes && <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{truncatedNotes}</p>}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            {prescriptionCount} Rx
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
            {reportCount} Reports
          </span>
          <div className="ml-auto">
            <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
