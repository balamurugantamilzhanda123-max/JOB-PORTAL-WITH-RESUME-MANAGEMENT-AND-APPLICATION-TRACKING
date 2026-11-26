import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AppProviders } from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TalentForge ATS — Enterprise Recruitment Management Platform',
  description:
    'Enterprise Recruitment Management & Applicant Tracking System: Secure Authentication, PostgreSQL Persistence, Job Portal & Search Engine.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AppProviders>
      </body>
    </html>
  );
}
