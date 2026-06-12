'use client';

import React, { useState } from 'react';
import axios from 'axios';

interface RoleDetail {
  role: string;
  name: string;
  email: string;
  clearance: string;
  description: string;
  color: string;
  border: string;
  glow: string;
  badge: string;
  privileges: string[];
  restrictions: string[];
  tasks: string[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function DemoPage() {
  const [selectedRole, setSelectedRole] = useState<string>('lead_astrologer');
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleDetails: Record<string, RoleDetail> = {
    super_admin: {
      role: 'super_admin',
      name: 'Super System Administrator',
      email: 'admin@crm.com',
      clearance: 'Clearance Tier: LEVEL 5 (UNRESTRICTED BYPASS)',
      description: 'The ultimate system guardian. Has full read and write clearance over spiritual consultation notes, audit compliance ledgers, database parameters, and user profiles.',
      color: 'text-red-400 bg-red-500/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-950/45',
      badge: 'border-red-500/50 text-red-400 bg-red-500/5',
      privileges: [
        'Read raw unredacted consultation notes (ignores PII masking)',
        'Access full client ledger directories and logs',
        'Create/Update roles and settings'
      ],
      restrictions: [
        'None. Security bypass enabled for forensic audit compliance.'
      ],
      tasks: [
        'Navigate to the Workspace tab.',
        'Click on Aria Vance or Devin Patel\'s booking card.',
        'Click "Inspect Note" in the card or inspect button.',
        'Verify that you see the raw email addresses, credit cards, and phone numbers without redactions.'
      ]
    },
    lead_astrologer: {
      role: 'lead_astrologer',
      name: 'Senior Lead Astrologer',
      email: 'lead@crm.com',
      clearance: 'Clearance Tier: LEVEL 4 (ASSIGNED CLEARANCE)',
      description: 'Senior spiritual consultant. Responsible for analyzing planetary charts, writing consultation notes, and managing temporary advisor referrals.',
      color: 'text-[#C5A059] bg-[#C5A059]/10',
      border: 'border-[#C5A059]/30',
      glow: 'shadow-[#C5A059]/45',
      badge: 'border-[#C5A059]/50 text-[#C5A059] bg-[#C5A059]/5',
      privileges: [
        'Write and edit consultation notes',
        'Read raw unredacted notes for assigned clients',
        'Authorize temporary referral access tokens (ABAC) for other advisors'
      ],
      restrictions: [
        'Consultation notes of unassigned clients remain redacted/masked unless temporary referral access is granted.'
      ],
      tasks: [
        'Select Devin Patel or Aria Vance from the calendar schedules.',
        'Check the planetary positions grid in the sidebar calculated live by the engine.',
        'Write a spiritual consultation observation in the "Spiritual Consultation Log" text area and submit.',
        'Inspect the audit logs on the database to see the USER_LOG and NOTE_EDITED tracking.'
      ]
    },
    junior_astrologer: {
      role: 'junior_astrologer',
      name: 'Junior Advisor Assistant',
      email: 'junior@crm.com',
      clearance: 'Clearance Tier: LEVEL 2 (RESTRICTED ADVISOR)',
      description: 'Junior spiritual assistant. Assists in reviewing client directories and schedules, but lacks clearance to view sensitive client identifiers.',
      color: 'text-[#4EA8DE] bg-[#4EA8DE]/10',
      border: 'border-[#4EA8DE]/30',
      glow: 'shadow-[#4EA8DE]/45',
      badge: 'border-[#4EA8DE]/50 text-[#4EA8DE] bg-[#4EA8DE]/5',
      privileges: [
        'View upcoming scheduled consultations list',
        'Search and filter client directory ledger',
        'Read PII-masked consultation notes'
      ],
      restrictions: [
        'Sensitive client information (emails, phones, credit cards) is masked dynamically to [REDACTED_EMAIL], [REDACTED_PHONE], [REDACTED_CARD] in all consultation logs.'
      ],
      tasks: [
        'Open the Workspace.',
        'Click on Devin Patel\'s card (which has a credit card) and select "Inspect Note".',
        'Verify that the credit card is masked as [REDACTED_CARD] and emails are [REDACTED_EMAIL] under PII scrubbing policies.'
      ]
    },
    finance_officer: {
      role: 'finance_officer',
      name: 'Corporate Finance Officer',
      email: 'finance@crm.com',
      clearance: 'Clearance Tier: LEVEL 1 (RESTRICTED NON-SPIRITUAL)',
      description: 'Liaison for payment operations. Can inspect generalized audit logs and metadata, but has no access to spiritual sessions or client birth charts.',
      color: 'text-amber-400 bg-amber-500/10',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-950/45',
      badge: 'border-amber-500/50 text-amber-400 bg-amber-500/5',
      privileges: [
        'View general ledger payment audit statuses',
        'Verify system compliance integrity checks'
      ],
      restrictions: [
        'Blocked entirely from booking schedule calendars.',
        'Access to birth profile natal charts is denied.',
        'Spiritual consultation note inspection triggers a 403 Forbidden Access error.'
      ],
      tasks: [
        'Confirm that you see a blocked calendar message indicating financial roles have restricted access.',
        'Verify that birth coordinates and notes tabs are hidden or return Access Denied.'
      ]
    },
    client: {
      role: 'client',
      name: 'Aria Vance (Demo Client)',
      email: 'aria@vance.com',
      clearance: 'Clearance Tier: LEVEL 0 (CLIENT SERVICE)',
      description: 'Spiritual client. Can review personal planetary coordinates, calibrate birth parameters, schedule consultations, and join virtual waiting rooms.',
      color: 'text-emerald-400 bg-emerald-500/10',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-950/45',
      badge: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5',
      privileges: [
        'Submit exact birth coordinates (Settings page)',
        'View personal planetary placements calculated by Astrology Engine',
        'Reserve consultation slots (validating 15-minute buffers)',
        'Activate websocket Waiting Room signals'
      ],
      restrictions: [
        'Lacks access to the client ledger directory tab.',
        'Lacks access to write/edit consultation journals.'
      ],
      tasks: [
        'Inspect your calculated planetary placements.',
        'Click "Join Virtual Waiting Room" to broadcast your wait state.',
        'Log in as Lead Astrologer in another browser (or tab) and verify the real-time websocket toast alert is displayed.'
      ]
    }
  };

  const handleSimulatedLogin = async (roleKey: string) => {
    setIsSimulating(true);
    setErrorMsg(null);
    const target = roleDetails[roleKey];
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: target.email,
        password: 'supersecret123'
      });

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userName', response.data.user.name);
        // Direct redirect
        window.location.href = '/dashboard';
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const current = roleDetails[selectedRole];

  return (
    <main className="min-h-screen bg-[#0B0C10] font-sans text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-3">
          <span className="px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-bold uppercase tracking-wider bg-[#C5A059]/5 inline-block animate-pulse">
            Interactive System Tour
          </span>
          <h1 className="text-4xl font-extrabold text-[#F5F5F7] tracking-tight bg-gradient-to-r from-white via-[#C5A059] to-white bg-clip-text text-transparent">
            Role Access & Clearance Center
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            Evaluate the security boundaries of AstroCRM V4.0. Select any role profile below to explore credentials, privileges, and simulate one-click logins.
          </p>
        </div>

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          
          {/* Left Panel: Role Selector Grid (2/5 width) */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C5A059] mb-2 px-1">Clearance Tier Profiles</h3>
            
            {Object.keys(roleDetails).map((key) => {
              const r = roleDetails[key];
              const isSelected = selectedRole === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedRole(key)}
                  className={`p-4 rounded-2xl border transition duration-300 cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? `bg-[#1F2833] ${r.border} shadow-lg shadow-black/60`
                      : 'bg-[#1F2833]/45 border-[#1F2833] hover:border-[#C5A059]/20'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{r.name.split(' (')[0]}</span>
                    <span className="text-[10px] font-mono text-slate-500">{r.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${isSelected ? r.color + ' ' + r.border : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}>
                    {key.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Role Privileges & Simulator (3/5 width) */}
          <div className="md:col-span-3 bg-[#1F2833]/70 border border-[#C5A059]/25 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md">
            
            {/* Header detail */}
            <div className="border-b border-[#C5A059]/10 pb-4">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-wider ${current.badge} ${current.border}`}>
                {current.clearance}
              </span>
              <h2 className="text-2xl font-bold text-[#F5F5F7] mt-3">{current.name}</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{current.description}</p>
            </div>

            {/* Quick credentials card */}
            <div className="p-4 bg-[#0B0C10]/60 border border-[#1F2833] rounded-2xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Login Credentials:</span>
                <span className="text-slate-300">User: {current.email}</span>
                <span className="text-slate-500 block">Pass: supersecret123</span>
              </div>
              
              <button
                onClick={() => handleSimulatedLogin(current.role)}
                disabled={isSimulating}
                className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#d6b068] hover:to-[#e5bf48] text-[#0B0C10] font-bold px-4 py-2.5 rounded-xl active:scale-95 transition disabled:opacity-50 text-xs shadow-md"
              >
                {isSimulating ? 'Authenticating...' : 'Enter Workspace 🚀'}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Privileges & Restrictions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Approved Actions</span>
                </h4>
                <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300 leading-relaxed">
                  {current.privileges.map((p, idx) => (
                    <li key={idx} className="marker:text-emerald-500">{p}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-red-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Security Blocked</span>
                </h4>
                <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300 leading-relaxed">
                  {current.restrictions.map((r, idx) => (
                    <li key={idx} className="marker:text-red-500">{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step by Step Evaluation Guide */}
            <div className="border-t border-[#C5A059]/10 pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A059]">
                Evaluation Guide Checklist
              </h4>
              <ol className="space-y-2 text-xs text-slate-300 leading-relaxed">
                {current.tasks.map((task, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 bg-[#0B0C10] border border-[#C5A059]/20 rounded-full text-[10px] font-bold text-[#C5A059] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{task}</span>
                  </li>
                ))}
              </ol>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
