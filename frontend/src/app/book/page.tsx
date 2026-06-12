'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Astrologer {
  id: string;
  name: string;
  email: string;
}

interface PlanetaryPosition {
  name: string;
  zodiacSign: string;
  degree: number;
  house: number;
  isRetrograde: boolean;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function BookSessionPage() {
  // Available advisors
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('supersecret123'); // Default password for easy seeder login
  const [selectedAstrologerId, setSelectedAstrologerId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  // Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load astrologers list from database
  useEffect(() => {
    const fetchAstrologers = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/astrologers`);
        if (response.data?.success) {
          setAstrologers(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedAstrologerId(response.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching astrologers:', err);
      } finally {
        setLoadingAdvisors(false);
      }
    };
    fetchAstrologers();
  }, []);

  // Submit booking and profile details
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessData(null);

    try {
      // 1. Authenticate / Auto-seed the Client account
      const authResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      if (!authResponse.data?.token) {
        throw new Error('Failed to establish secure client session.');
      }

      const clientToken = authResponse.data.token;

      // 2. Save Birth Profile and trigger calculation matrix
      const profileResponse = await axios.post(
        `${BACKEND_URL}/api/astrology/profile`,
        {
          birth_date: birthDate,
          birth_time: birthTime,
          birth_place: birthPlace,
        },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );

      if (!profileResponse.data?.success) {
        throw new Error('Failed to run planetary alignments matrix.');
      }

      const calculatedPositions = profileResponse.data.data.planetary_positions;

      // 3. Book the Appointment slot (Checking 15m conflicts)
      const scheduledDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const bookingResponse = await axios.post(
        `${BACKEND_URL}/api/appointments/book`,
        {
          astrologer_id: selectedAstrologerId,
          scheduled_at: scheduledDateTime.toISOString(),
          client_id: authResponse.data.user.id
        },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );

      if (!bookingResponse.data?.success) {
        throw new Error('Failed to secure scheduling slot.');
      }

      // Success payload
      setSuccessData({
        clientName: authResponse.data.user.name,
        appointmentTime: scheduledDateTime.toLocaleString(),
        ascendant: calculatedPositions.calculatedAscendant,
        positions: calculatedPositions.planetaryPositions as PlanetaryPosition[]
      });

    } catch (err: any) {
      console.error('Booking alignment error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'An error occurred during booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS LAYOUT
  if (successData) {
    return (
      <main className="flex-1 bg-[#0B0C10] font-sans text-slate-300 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-[#1F2833]/80 border border-[#C5A059]/30 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-center">
            <span className="p-3 inline-block rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-4 animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7]">Alignment Secured</h2>
            <p className="text-xs text-[#C5A059] mt-2">Consultation slot locked. Natal calculations generated.</p>
          </div>

          <div className="bg-[#0B0C10]/60 border border-[#1F2833] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Consultant</span>
                <span className="font-semibold text-slate-200">{successData.clientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Scheduled At</span>
                <span className="font-semibold text-slate-200">{successData.appointmentTime}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#1F2833]">
                <span className="text-slate-500 block">Calculated Ascendant (Lagna)</span>
                <span className="font-bold text-[#4EA8DE]">{successData.ascendant}</span>
              </div>
            </div>

            {/* Planetary positions list */}
            <div className="border-t border-[#1F2833] pt-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Planetary Coordinates</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                {successData.positions.slice(0, 4).map((p: PlanetaryPosition) => (
                  <div key={p.name} className="p-2 bg-[#1F2833]/30 border border-[#1F2833] rounded-xl text-center">
                    <span className="text-slate-400 block font-semibold">{p.name}</span>
                    <span className="text-[#C5A059] block">{p.zodiacSign}</span>
                    <span className="text-slate-600 block">{p.degree}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-block bg-[#C5A059] hover:bg-[#d6b068] text-[#0B0C10] font-bold text-xs uppercase tracking-wider px-8 py-3 rounded-xl transition shadow-lg active:scale-[0.98]"
            >
              Access Client Workspace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // STANDARD INTAKE FORM LAYOUT
  return (
    <main className="flex-1 bg-[#0B0C10] font-sans text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl mx-auto bg-[#1F2833]/60 border border-[#C5A059]/20 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        
        <div className="text-center mb-8">
          <span className="text-[#C5A059] text-[9px] uppercase font-bold tracking-widest block">Intake Channel</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F7] mt-1">Book Consultation</h2>
          <p className="text-xs text-slate-500 mt-2">Enter birth parameters to run natal alignments.</p>
        </div>

        {/* Database validation warning if no astrologers found */}
        {!loadingAdvisors && astrologers.length === 0 ? (
          <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center space-y-3">
            <h4 className="text-amber-400 text-sm font-bold">No Active Advisors Registered</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Before booking, at least one astrologer user must exist in the database. Please navigate to the **[Workspace](/dashboard)** and log in as `lead@crm.com` to auto-seed user accounts.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#C5A059] text-[#0B0C10] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition"
            >
              Go Seed database
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Client Credentials */}
            <div className="space-y-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block border-b border-[#1F2833] pb-1">1. User Credentials</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Seeking Client"
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="client@crm.com"
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Schedule parameters */}
            <div className="space-y-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block border-b border-[#1F2833] pb-1">2. Appointment Alignment</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Select Advisor</label>
                  {loadingAdvisors ? (
                    <div className="text-xs text-slate-500">Loading available advisors...</div>
                  ) : (
                    <select
                      className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                      value={selectedAstrologerId}
                      onChange={(e) => setSelectedAstrologerId(e.target.value)}
                    >
                      {astrologers.map((ast) => (
                        <option key={ast.id} value={ast.id}>{ast.name} ({ast.email})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Booking Time (15m buffer check)</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Birth Details */}
            <div className="space-y-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block border-b border-[#1F2833] pb-1">3. Coordinates parameters</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Time</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Location</label>
                  <input
                    type="text"
                    required
                    placeholder="New Delhi, India"
                    className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C5A059] hover:bg-[#d6b068] text-[#0B0C10] font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSubmitting ? 'Securing Alignment...' : 'Establish Session & Booking'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
