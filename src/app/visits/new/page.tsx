import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import VisitForm from '@/components/VisitForm';
import Link from 'next/link';

export default async function NewVisitPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <Navbar userName={user.name} />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-2xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Link href="/dashboard" className="hover:text-brand-600 transition-colors">Dashboard</Link>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-slate-600 font-medium">New Visit</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-fade-in">
            <div className="mb-6">
              <h1 className="font-display text-2xl text-slate-800 mb-1">Record a Visit</h1>
              <p className="text-sm text-slate-400">
                Fill in the details below. You can add prescriptions and reports after creating the visit.
              </p>
            </div>
            <VisitForm />
          </div>
        </div>
      </main>
    </div>
  );
}
