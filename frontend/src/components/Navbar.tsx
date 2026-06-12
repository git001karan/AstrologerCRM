'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Book Session', href: '/book' },
    { name: 'Workspace', href: '/dashboard' },
    { name: 'Role Tour 🔮', href: '/demo' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0C10]/75 backdrop-blur-md border-b border-[#C5A059]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="p-1.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25 group-hover:border-[#C5A059] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.9 1.39-.9 1.69 0l5.44 16.32a.8.8 0 01-1.15.96l-5.38-3.23a.8.8 0 00-.77 0l-5.38 3.23a.8.8 0 01-1.15-.96l5.44-16.32z" />
            </svg>
          </span>
          <div className="leading-none">
            <span className="font-bold text-[#F5F5F7] text-md tracking-wider">AstroCRM</span>
            <span className="block text-[8px] text-[#C5A059] font-bold tracking-widest uppercase">Cosmic advisory</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-semibold uppercase tracking-wider transition duration-200 ${
                  isActive
                    ? 'text-[#C5A059] border-b-2 border-[#C5A059] pb-1.5 mt-1.5'
                    : 'text-slate-400 hover:text-[#C5A059]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
