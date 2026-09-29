import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CompareProvider } from '@/features/compare/CompareContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookCompareDock } from '@/components/BookCompareDock';
import { BookCompareModal } from '@/components/BookCompareModal';
import { LibraryCompanion } from '@/components/LibraryCompanion';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Metropolitan Library Management System | Minimalist 2026 Edition',
  description: 'Production-ready university and public library circulation, reservation, inventory, and catalog platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#faf8f5] text-stone-900 selection:bg-stone-800 selection:text-white">
        <AuthProvider>
          <CompareProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <BookCompareDock />
            <BookCompareModal />
            <LibraryCompanion />
          </CompareProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
