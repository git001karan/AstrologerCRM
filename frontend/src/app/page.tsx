import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  // Deterministic daily transit data mock to make the landing page feel alive and functional
  const dailyTransits = [
    { planet: 'Sun', sign: 'Gemini', position: '22° 15\'', movement: 'Direct' },
    { planet: 'Moon', sign: 'Leo', position: '05° 40\'', movement: 'Direct' },
    { planet: 'Mercury', sign: 'Cancer', position: '11° 02\'', movement: 'Retrograde' },
    { planet: 'Venus', sign: 'Taurus', position: '29° 54\'', movement: 'Direct' },
    { planet: 'Mars', sign: 'Aries', position: '18° 10\'', movement: 'Direct' },
    { planet: 'Saturn', sign: 'Pisces', position: '19° 44\'', movement: 'Retrograde' },
  ];

  return (
    <main className="flex-1 bg-[#0B0C10] font-sans text-slate-300">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 text-center border-b border-[#1F2833]/60 bg-gradient-to-b from-[#1F2833]/10 to-transparent">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <span className="inline-flex px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-[10px] uppercase font-bold tracking-widest leading-none">
            Spiritual-Tech Operations
          </span>
          
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#F5F5F7]">
            Divine Alignment.<br />
            <span className="bg-gradient-to-r from-[#C5A059] via-[#F5F5F7] to-[#4EA8DE] bg-clip-text text-transparent">
              Enterprise Control.
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Marrying precision astronomical ephemeris models with secure CRM calendar systems. AstroCRM enables professional astrological firms to coordinate high-clearance consults with mathematical certainty.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/book"
              className="w-full sm:w-auto bg-[#C5A059] hover:bg-[#d6b068] text-[#0B0C10] font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-[#C5A059]/10 active:scale-[0.98]"
            >
              Book Consultation
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-[#1F2833] border border-[#C5A059]/35 hover:border-[#C5A059] text-[#F5F5F7] font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition hover:bg-[#1f2833]/70 active:scale-[0.98]"
            >
              Advisor Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* 2. CORE FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-[#C5A059] text-[9px] uppercase font-bold tracking-widest">Platform Core</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] mt-1">Engineered Astrological Services</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[#1F2833]/40 border border-[#1F2833] rounded-3xl p-6 hover:border-[#C5A059]/20 transition duration-300">
            <span className="p-3 inline-block rounded-2xl bg-[#C5A059]/10 text-[#C5A059] mb-4 border border-[#C5A059]/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <h3 className="text-lg font-bold text-[#F5F5F7] mb-2">ABAC Note Cryptography</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Client journals and consultation records undergo automatic email, phone, and card tokenization, preventing data exposure unless accessed by authorized lead advisors.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#1F2833]/40 border border-[#1F2833] rounded-3xl p-6 hover:border-[#C5A059]/20 transition duration-300">
            <span className="p-3 inline-block rounded-2xl bg-[#4EA8DE]/10 text-[#4EA8DE] mb-4 border border-[#4EA8DE]/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </span>
            <h3 className="text-lg font-bold text-[#F5F5F7] mb-2">Planetary Coordinates Matrix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates deterministic calculations mapping the Sun, Moon, and Ascendant positions relative to client birth coordinates immediately on dashboard loads.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#1F2833]/40 border border-[#1F2833] rounded-3xl p-6 hover:border-[#C5A059]/20 transition duration-300">
            <span className="p-3 inline-block rounded-2xl bg-[#C5A059]/10 text-[#C5A059] mb-4 border border-[#C5A059]/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h3 className="text-lg font-bold text-[#F5F5F7] mb-2">15-Min Buffer Calendars</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Eliminates scheduling friction. Our algorithmic conflict resolver blocks consecutive slots within 15 minutes of each other and suggests alternative openings.
            </p>
          </div>
        </div>
      </section>

      {/* 3. DAILY TRANSITS PREVIEW WIDGET */}
      <section className="bg-[#1F2833]/20 border-t border-b border-[#1F2833]/60 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[#4EA8DE] text-[9px] uppercase font-bold tracking-widest">Real-time transits</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F7] mt-1">Stellar Alignments Today</h2>
          </div>

          <div className="bg-[#1F2833]/60 border border-[#C5A059]/15 rounded-3xl p-6 shadow-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {dailyTransits.map((item) => (
                <div key={item.planet} className="bg-[#0B0C10] border border-[#1F2833] rounded-2xl p-4 text-center space-y-1 hover:border-[#4EA8DE]/30 transition duration-200">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">{item.planet}</span>
                  <div className="text-sm font-semibold text-[#4EA8DE]">{item.sign}</div>
                  <div className="text-xs text-slate-400">{item.position}</div>
                  <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                    item.movement === 'Retrograde' ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'
                  }`}>
                    {item.movement}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
