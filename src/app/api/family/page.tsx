import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import FamilyClient from './FamilyClient';

export default async function FamilyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <Navbar userName={user.name} />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <FamilyClient />
      </main>
    </div>
  );
}
