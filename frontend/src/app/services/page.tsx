import React from 'react';
import Link from 'next/link';

export default function ServicesPage() {
  const tiers = [
    {
      name: 'Natal Alignment',
      price: '$99',
      duration: '45 Mins',
      description: 'A deep-dive analysis of your natal chart coordinates mapping out planet houses, ascendant lords, and planetary degrees.',
      features: [
        'Deterministic birth matrix calculation',
        'Sun, Moon, and Ascendant positions',
        '1:1 secure video consultation',
        'PII-encrypted session notes access',
      ],
      border: 'border-[#1F2833]',
      badge: 'Natal Core',
      badgeStyles: 'bg-slate-900 text-slate-400 border-slate-800',
    },
    {
      name: 'Compatibility Handoff',
      price: '$189',
      duration: '60 Mins',
      description: 'Ashta-koota matching evaluation mapping moon constellations and solar Return aspects for relationship alignment checks.',
      features: [
        'Dual chart matrix calculation',
        '36-point compatibility report PDF',
        'Cross-referral junior advisor support',
        'Shared timeline booking access',
      ],
      border: 'border-[#C5A059]/40',
      badge: 'Most Selected',
      badgeStyles: 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20 shadow-sm shadow-[#C5A059]/5',
    },
    {
      name: 'Transit Audit',
      price: '$279',
      duration: '90 Mins',
      description: 'Advanced predictive alignment evaluating transit orbits crossing natal houses (e.g., Sade Sati, Saturn Returns).',
      features: [
        '12-month planetary transit charts',
        'Inauspicious conflict warning grids',
        'Lead Astrologer dedicated review',
        'Lifetime encrypted logs archive',
      ],
      border: 'border-[#4EA8DE]/30',
      badge: 'Stellar High',
      badgeStyles: 'bg-[#4EA8DE]/10 text-[#4EA8DE] border-[#4EA8DE]/20',
    },
  ];

  return (
    <main className="flex-1 bg-[#0B0C10] font-sans text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-[#C5A059] text-[9px] uppercase font-bold tracking-widest block">Consultation Tiers</span>
          <h1 className="text-4xl font-bold text-[#F5F5F7]">Align with Professional Guidance</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Book secure sessions calculated under strict 15-minute buffer zone rules. Select a tier to align your coordinates.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-[#1F2833]/40 border rounded-3xl p-8 flex flex-col justify-between hover:scale-[1.01] transition duration-300 ${tier.border}`}
            >
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${tier.badgeStyles}`}>
                    {tier.badge}
                  </span>
                  <span className="text-xs text-slate-500">{tier.duration}</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#F5F5F7]">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-[#F5F5F7]">{tier.price}</span>
                    <span className="text-slate-500 text-xs font-semibold">/ session</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed border-t border-[#1F2833] pt-4">
                  {tier.description}
                </p>

                {/* Features List */}
                <ul className="space-y-3 pt-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="text-[#4EA8DE]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <Link
                  href="/book"
                  className="w-full block text-center bg-[#1F2833] border border-[#C5A059]/35 hover:border-[#C5A059] text-[#F5F5F7] hover:bg-[#C5A059] hover:text-[#0B0C10] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition duration-200"
                >
                  Request Alignment
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
