import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'AstroCRM - Astro Scheduler Portal',
  description: 'Production-ready synchronized scheduler for astrologer consultation channels.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#0B0C10] text-[#F5F5F7] flex flex-col">
        {/* Persistent site header */}
        <Navbar />
        
        {/* Content routing wrapper */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        
        {/* Persistent site footer */}
        <Footer />
      </body>
    </html>
  );
}
