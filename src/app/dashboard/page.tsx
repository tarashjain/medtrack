import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <Navbar userName={user.name} />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <DashboardClient />
      </main>
    </div>
  );
}
