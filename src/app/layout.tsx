import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedTrack — Medical Records',
  description: 'Secure personal medical records tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
