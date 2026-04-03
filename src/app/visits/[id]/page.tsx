import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import VisitDetailClient from './VisitDetailClient';

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await Promise.resolve(params);
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <Navbar userName={user.name} />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <VisitDetailClient visitId={id} />
      </main>
    </div>
  );
}
