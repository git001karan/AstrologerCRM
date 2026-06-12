'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Interfaces for our component state
interface Appointment {
  id: string;
  client_id: string;
  astrologer_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  client_name: string;
  client_email: string;
  note_id?: string;
}

interface PlanetaryPosition {
  name: string;
  zodiacSign: string;
  degree: number;
  house: number;
  isRetrograde: boolean;
}

interface HouseDetail {
  houseNumber: number;
  zodiacSign: string;
  degree: number;
  lord: string;
}

interface BirthProfileData {
  clientBirthPlace: string;
  calculatedAscendant: string;
  planetaryPositions: PlanetaryPosition[];
  houses: HouseDetail[];
}

interface BirthProfile {
  id: string;
  client_id: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  planetary_positions: BirthProfileData;
}

interface ClientDirectoryItem {
  id: string;
  name: string;
  email: string;
  created_at: string;
  last_consultation_at: string | null;
  total_sessions: number;
}

interface AstrologerItem {
  id: string;
  name: string;
  email: string;
}

interface WaitingAlert {
  clientId: string;
  clientName: string;
  timestamp: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function PremiumDashboard() {
  // Authentication & View states
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  
  // Auth Form State
  const [email, setEmail] = useState('lead@crm.com');
  const [password, setPassword] = useState('supersecret123');
  const [isSignup, setIsSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'client' | 'lead_astrologer' | 'junior_astrologer' | 'finance_officer'>('client');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupSuccessMsg, setSignupSuccessMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab controller for advisor dashboard
  const [activeTab, setActiveTab] = useState<'schedule' | 'directory'>('schedule');

  // Directory Search Ledger States
  const [directoryClients, setDirectoryClients] = useState<ClientDirectoryItem[]>([]);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotalPages, setDirectoryTotalPages] = useState(1);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Public Astrologer List (for client booking)
  const [astrologers, setAstrologers] = useState<AstrologerItem[]>([]);

  // Client Booking Form States
  const [bookAstrologerId, setBookAstrologerId] = useState('');
  const [bookScheduledAt, setBookScheduledAt] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Waitroom State
  const [waitingRoomStatus, setWaitingRoomStatus] = useState<string | null>(null);
  const [waitingRoomAlerts, setWaitingRoomAlerts] = useState<WaitingAlert[]>([]);

  // Schedule Feed States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [birthProfile, setBirthProfile] = useState<BirthProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [newAppointmentAlert, setNewAppointmentAlert] = useState<string | null>(null);

  // Consultation Note Editor States
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaveMsg, setNoteSaveMsg] = useState<string | null>(null);

  // Client Birth Form Settings States
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Referral Token Form State (ABAC testing component)
  const [referralTargetId, setReferralTargetId] = useState('');
  const [referralDuration, setReferralDuration] = useState(300); // 5 minutes default
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string | null>(null);
  const [grantErrorMsg, setGrantErrorMsg] = useState<string | null>(null);
  const [grantingReferral, setGrantingReferral] = useState(false);

  // Note Modal State (PII Scrubber check)
  const [activeNoteText, setActiveNoteText] = useState<string | null>(null);
  const [inspectingNoteId, setInspectingNoteId] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [noteRoleClearance, setNoteRoleClearance] = useState<'raw' | 'masked' | 'denied' | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Retrieve token from localStorage on client-side mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedName = localStorage.getItem('userName');
    if (savedToken) {
      setToken(savedToken);
      setUserName(savedName);
      try {
        const payload = parseTokenPayload(savedToken);
        setUserId(payload.id);
        setUserRole(payload.role);
      } catch (e) {
        console.error(e);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const parseTokenPayload = (t: string) => {
    const base64Url = t.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  };

  // Fetch appointments schedule for current user
  const fetchSchedule = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/appointments/my-schedule`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.data?.success) {
        setAppointments(response.data.data);
      } else {
        throw new Error(response.data?.error || 'Failed to retrieve schedule');
      }
    } catch (err: any) {
      console.error('Fetch schedule error:', err);
      if (err.response?.status === 403) {
        setError('Access Restricted: General roles do not have direct access to spiritual calendar schedule directories.');
      } else if (err.response?.status === 401) {
        handleLogout();
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.error || err.message || 'Network connectivity error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch public list of astrologers for client booking options
  const fetchAstrologers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/astrologers`);
      if (response.data?.success) {
        setAstrologers(response.data.data);
        if (response.data.data.length > 0) {
          setBookAstrologerId(response.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load astrologers list:', err);
    }
  };

  // Fetch client own birth profile (client role)
  const fetchClientOwnBirthProfile = async (authToken: string) => {
    setLoadingProfile(true);
    setBirthProfile(null);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/astrology/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.data?.success && response.data.data) {
        setBirthProfile(response.data.data);
        setBirthDate(response.data.data.birth_date ? response.data.data.birth_date.split('T')[0] : '');
        setBirthTime(response.data.data.birth_time || '');
        setBirthPlace(response.data.data.birth_place || '');
      }
    } catch (err) {
      console.error('Error fetching client own birth profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch searchable directory ledger for advisors
  const fetchDirectory = async (searchVal: string, pageNum: number) => {
    if (!token) return;
    setLoadingDirectory(true);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/clients/directory?search=${encodeURIComponent(searchVal)}&page=${pageNum}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        setDirectoryClients(response.data.data.clients);
        setDirectoryTotalPages(response.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to query client directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Trigger loading based on login state
  useEffect(() => {
    if (token) {
      fetchSchedule(token);
      if (userRole === 'client') {
        fetchClientOwnBirthProfile(token);
        fetchAstrologers();
      }
    }
  }, [token, userRole]);

  // Handle directories queries when tab changes
  useEffect(() => {
    if (token && activeTab === 'directory' && ['lead_astrologer', 'super_admin', 'junior_astrologer'].includes(userRole || '')) {
      fetchDirectory(directorySearch, directoryPage);
    }
  }, [token, activeTab, directoryPage, directorySearch]);

  // Fetch birth profile for selected appointment client
  const fetchBirthProfile = async (clientId: string) => {
    setLoadingProfile(true);
    setBirthProfile(null);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/astrology/profile/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success && response.data.data) {
        setBirthProfile(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching client birth profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch and inspect consultation notes (PII scrubber check)
  const handleInspectNote = async (noteId: string) => {
    setLoadingNote(true);
    setActiveNoteText(null);
    setInspectingNoteId(noteId);
    setNoteRoleClearance(null);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/appointments/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        const text = response.data.noteText;
        setActiveNoteText(text);
        
        // Identify note access clearance levels
        if (text.includes('[REDACTED_EMAIL]') || text.includes('[REDACTED_PHONE]') || text.includes('[REDACTED_CARD]')) {
          setNoteRoleClearance('masked');
        } else {
          setNoteRoleClearance('raw');
        }
      }
    } catch (err: any) {
      console.error('Error fetching consultation note', err);
      setActiveNoteText(err.response?.data?.error || 'Access to this client note is blocked.');
      setNoteRoleClearance(err.response?.status === 403 ? 'denied' : 'masked');
    } finally {
      setLoadingNote(false);
    }
  };

  // Submit consultation notes write
  const handleSaveConsultationNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setSavingNote(true);
    setNoteSaveMsg(null);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/appointments/notes`,
        { appointment_id: selectedAppointment.id, note_text: newNoteText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        setNoteSaveMsg('Spiritual consultation note has been persisted to the audit logs!');
        // Refresh schedule to update note status
        fetchSchedule(token || '');
        // Clear editor
        setNewNoteText('');
      }
    } catch (err: any) {
      console.error('Error saving note:', err);
      setNoteSaveMsg(err.response?.data?.error || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  // Submit and create new Birth Profile (Settings parameters override)
  const handleSaveBirthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const payload = {
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place: birthPlace
      };

      const response = await axios.post(`${BACKEND_URL}/api/astrology/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        if (userRole === 'client') {
          fetchClientOwnBirthProfile(token || '');
        } else if (selectedAppointment) {
          fetchBirthProfile(selectedAppointment.client_id);
        }
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      simulateLocalMatrix();
    } finally {
      setSavingProfile(false);
    }
  };

  // Book an appointment (Client Dashboard)
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/appointments/book`,
        { astrologer_id: bookAstrologerId, scheduled_at: bookScheduledAt },
        { headers: { Authorization: `Bearer={${token}}` } } // Using token auth
      );
      if (response.data?.success) {
        setBookingSuccess('Consultation successfully scheduled! 15-minute buffer validated.');
        fetchSchedule(token || '');
        setBookScheduledAt('');
      }
    } catch (err: any) {
      console.error('Booking conflict error:', err);
      setBookingError(err.response?.data?.error || 'Failed to lock scheduled slot.');
    } finally {
      setIsBooking(false);
    }
  };

  // Join Virtual Waiting Room (Client Dashboard)
  const handleJoinWaitingRoom = () => {
    if (socketRef.current && userId) {
      socketRef.current.emit('JOIN_WAITING_ROOM', {
        clientId: userId,
        clientName: userName || 'Active Client'
      });
      setWaitingRoomStatus('Transmitting cosmic waiting frequency... Advisors notified.');
      setTimeout(() => setWaitingRoomStatus(null), 5000);
    }
  };

  // Grant temporary referral token (ABAC)
  const handleGrantReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setGrantingReferral(true);
    setGrantSuccessMsg(null);
    setGrantErrorMsg(null);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/astrology/referral`,
        {
          client_id: selectedAppointment.client_id,
          granted_to_astrologer_id: referralTargetId,
          duration_seconds: Number(referralDuration),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        setGrantSuccessMsg(`Temporary token granted! Access expires in ${referralDuration} seconds.`);
        setReferralTargetId('');
      }
    } catch (err: any) {
      console.error('Referral grant error', err);
      setGrantErrorMsg(err.response?.data?.error || 'Failed to authorize referral access.');
    } finally {
      setGrantingReferral(false);
    }
  };

  const simulateLocalMatrix = () => {
    const mockData: BirthProfileData = {
      clientBirthPlace: birthPlace || 'Varanasi, India',
      calculatedAscendant: 'Leo',
      planetaryPositions: [
        { name: 'Sun', zodiacSign: 'Libra', degree: 15.4, house: 3, isRetrograde: false },
        { name: 'Moon', zodiacSign: 'Taurus', degree: 4.8, house: 10, isRetrograde: false },
        { name: 'Mercury', zodiacSign: 'Scorpio', degree: 22.1, house: 4, isRetrograde: true },
        { name: 'Venus', zodiacSign: 'Virgo', degree: 11.3, house: 2, isRetrograde: false },
        { name: 'Mars', zodiacSign: 'Aries', degree: 9.6, house: 9, isRetrograde: false },
        { name: 'Jupiter', zodiacSign: 'Gemini', degree: 18.2, house: 11, isRetrograde: true },
        { name: 'Saturn', zodiacSign: 'Aquarius', degree: 28.5, house: 7, isRetrograde: false },
      ],
      houses: [
        { houseNumber: 1, zodiacSign: 'Leo', degree: 10.5, lord: 'Sun' },
        { houseNumber: 2, zodiacSign: 'Virgo', degree: 8.2, lord: 'Mercury' },
        { houseNumber: 3, zodiacSign: 'Libra', degree: 9.4, lord: 'Venus' },
        { houseNumber: 4, zodiacSign: 'Scorpio', degree: 11.2, lord: 'Mars' },
        { houseNumber: 5, zodiacSign: 'Sagittarius', degree: 13.5, lord: 'Jupiter' },
        { houseNumber: 6, zodiacSign: 'Capicorn', degree: 14.1, lord: 'Saturn' },
        { houseNumber: 7, zodiacSign: 'Aquarius', degree: 10.5, lord: 'Saturn' },
        { houseNumber: 8, zodiacSign: 'Pisces', degree: 8.2, lord: 'Jupiter' },
        { houseNumber: 9, zodiacSign: 'Aries', degree: 9.4, lord: 'Mars' },
        { houseNumber: 10, zodiacSign: 'Taurus', degree: 11.2, lord: 'Venus' },
        { houseNumber: 11, zodiacSign: 'Gemini', degree: 13.5, lord: 'Mercury' },
        { houseNumber: 12, zodiacSign: 'Cancer', degree: 14.1, lord: 'Moon' },
      ]
    };

    setBirthProfile({
      id: 'local-demo-profile',
      client_id: selectedAppointment?.client_id || userId || '',
      birth_date: birthDate,
      birth_time: birthTime,
      birth_place: birthPlace,
      planetary_positions: mockData
    });
  };

  // Setup Socket.io client
  useEffect(() => {
    if (!token) return;

    let currentUserId = '';
    let currentUserRole = '';
    try {
      const payload = parseTokenPayload(token);
      currentUserId = payload.id;
      currentUserRole = payload.role;
    } catch (e) {
      console.error(e);
    }

    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('NEW_APPOINTMENT', (data: { astrologerId: string; appointment: Appointment }) => {
      if (data.astrologerId === currentUserId || currentUserRole === 'super_admin') {
        setNewAppointmentAlert('Live alert: A client has booked a consultation session!');
        setAppointments((prev) => {
          const exists = prev.some((appt) => appt.id === data.appointment.id);
          if (exists) return prev;
          const updated = [...prev, data.appointment];
          return updated.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        });
        setTimeout(() => {
          setNewAppointmentAlert(null);
        }, 5000);
      }
    });

    // Handle Client Waiting alerts
    socket.on('CLIENT_WAITING', (data: WaitingAlert) => {
      if (['lead_astrologer', 'super_admin', 'junior_astrologer'].includes(currentUserRole)) {
        setWaitingRoomAlerts((prev) => {
          if (prev.some((a) => a.clientId === data.clientId)) return prev;
          return [...prev, data];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    setSignupSuccessMsg(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userName', response.data.user.name);
        setToken(response.data.token);
        setUserId(response.data.user.id);
        setUserRole(response.data.user.role);
        setUserName(response.data.user.name);
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || err.message || 'Login attempt failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Signup submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    setSignupSuccessMsg(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, {
        name: signupName,
        email,
        password,
        role: signupRole
      });

      if (response.data?.success) {
        setSignupSuccessMsg('Signup successful! Please login with your new credentials below.');
        setIsSignup(false);
        setSignupName('');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || err.message || 'Signup request failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserId(null);
    setUserRole(null);
    setUserName(null);
    setAppointments([]);
    setSelectedAppointment(null);
    setBirthProfile(null);
    setSocketConnected(false);
    setWaitingRoomAlerts([]);
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getRoleColors = (r: string | null) => {
    const defaultStyles = 'bg-slate-900 text-slate-400 border-slate-800';
    if (!r) return defaultStyles;
    const styles: Record<string, string> = {
      super_admin: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-950/20',
      lead_astrologer: 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20 shadow-[#C5A059]/20',
      junior_astrologer: 'bg-[#4EA8DE]/10 text-[#4EA8DE] border-[#4EA8DE]/20',
      finance_officer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      client: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return styles[r] || defaultStyles;
  };

  // RENDER LOGIN / SIGNUP SCREEN (Unauthenticated state)
  if (!token) {
    return (
      <main className="min-h-screen bg-[#0B0C10] flex items-center justify-center p-4 font-sans text-[#F5F5F7]">
        <div className="w-full max-w-md bg-[#1F2833]/80 border border-[#C5A059]/30 rounded-3xl p-8 shadow-2xl shadow-black/80 backdrop-blur-md">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-[#C5A059]/10 text-[#C5A059] mb-3 animate-pulse border border-[#C5A059]/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="6" strokeWidth="2" />
                <ellipse cx="12" cy="12" rx="10" ry="3" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#F5F5F7] via-[#C5A059] to-[#F5F5F7] bg-clip-text text-transparent">AstroCRM V4.0</h1>
            <p className="text-xs text-[#C5A059] mt-2">Spiritual Enterprise Access Grid (RBAC & ABAC)</p>
          </div>

          {/* Quick links to seed different users for evaluation */}
          <div className="mb-6 p-4 bg-[#0B0C10]/60 border border-[#1F2833] rounded-2xl space-y-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Evaluation Credentials Helper:</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                onClick={() => { setEmail('admin@crm.com'); setPassword('supersecret123'); setIsSignup(false); }}
                className="text-left px-2 py-1 rounded bg-[#1F2833] border border-red-500/25 text-red-400 hover:border-red-500 transition"
              >
                Super Admin
              </button>
              <button
                onClick={() => { setEmail('lead@crm.com'); setPassword('supersecret123'); setIsSignup(false); }}
                className="text-left px-2 py-1 rounded bg-[#1F2833] border border-[#C5A059]/25 text-[#C5A059] hover:border-[#C5A059] transition"
              >
                Lead Astrologer
              </button>
              <button
                onClick={() => { setEmail('junior@crm.com'); setPassword('supersecret123'); setIsSignup(false); }}
                className="text-left px-2 py-1 rounded bg-[#1F2833] border border-[#4EA8DE]/25 text-[#4EA8DE] hover:border-[#4EA8DE] transition"
              >
                Junior Astrologer
              </button>
              <button
                onClick={() => { setEmail('finance@crm.com'); setPassword('supersecret123'); setIsSignup(false); }}
                className="text-left px-2 py-1 rounded bg-[#1F2833] border border-amber-500/25 text-amber-400 hover:border-amber-500 transition"
              >
                Finance Officer
              </button>
              <button
                onClick={() => { setEmail('client@crm.com'); setPassword('supersecret123'); setIsSignup(false); }}
                className="text-left px-2 py-1 rounded bg-[#1F2833] border border-emerald-500/25 text-emerald-400 hover:border-emerald-500 transition col-span-2 text-center"
              >
                Client (client@crm.com)
              </button>
            </div>
          </div>

          {signupSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 mb-4">
              {signupSuccessMsg}
            </div>
          )}

          {isSignup ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Role Type</label>
                <select
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50"
                  value={signupRole}
                  onChange={(e: any) => setSignupRole(e.target.value)}
                >
                  <option value="client">Client</option>
                  <option value="lead_astrologer">Lead Astrologer</option>
                  <option value="junior_astrologer">Junior Astrologer</option>
                  <option value="finance_officer">Finance Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0C10] font-bold py-2.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Registering...' : 'Create Spiritual Account'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className="text-xs text-slate-400 hover:text-[#C5A059] transition"
                >
                  Already have an account? Log in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email-input" className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Email Address</label>
                <input
                  id="email-input"
                  type="email"
                  required
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lead@crm.com"
                />
              </div>

              <div>
                <label htmlFor="password-input" className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Security Password</label>
                <input
                  id="password-input"
                  type="password"
                  required
                  className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {loginError}
                </div>
              )}

              <button
                id="login-btn"
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0C10] font-bold py-2.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Verifying Credentials...' : 'Enter Secure Workspace'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className="text-xs text-slate-400 hover:text-[#C5A059] transition"
                >
                  Create a new Client or Advisor profile
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

  // RENDER MAIN WEBSITE INTERACTIVE WORKSPACE
  return (
    <main className="min-h-screen bg-[#0B0C10] font-sans text-slate-300 flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#1F2833]/90 border-r border-[#C5A059]/20 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.9 1.39-.9 1.69 0l5.44 16.32a.8.8 0 01-1.15.96l-5.38-3.23a.8.8 0 00-.77 0l-5.38 3.23a.8.8 0 01-1.15-.96l5.44-16.32z" />
              </svg>
            </span>
            <div>
              <h2 className="font-bold text-[#F5F5F7] tracking-wider leading-none">AstroCRM</h2>
              <span className="text-[9px] text-[#C5A059] font-semibold tracking-widest uppercase">Enterprise V4.0</span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {/* Active User Clearance Status */}
            <div className={`p-4 rounded-2xl border text-xs ${getRoleColors(userRole)}`}>
              <span className="text-slate-500 block mb-1">Clearance Tier</span>
              <span className="font-bold uppercase tracking-wider text-sm">
                {userRole ? userRole.replace('_', ' ') : 'Guest'}
              </span>
              
              {/* Copyable User UUID (Crucial for ABAC testing) */}
              <div className="mt-3 pt-2.5 border-t border-[#C5A059]/10">
                <span className="text-[9px] text-slate-500 block">Copy User ID:</span>
                <div className="flex items-center justify-between gap-1 mt-1 bg-[#0B0C10]/40 p-1.5 rounded border border-[#1F2833]">
                  <span className="font-mono text-[9px] truncate text-slate-400">{userId}</span>
                  <button
                    onClick={() => {
                      if (userId) {
                        navigator.clipboard.writeText(userId);
                        alert('Copied ID to Clipboard!');
                      }
                    }}
                    className="text-[9px] text-[#C5A059] hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Sockets Indicator */}
            {userRole !== 'finance_officer' && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0B0C10]/30 border border-[#1F2833]">
                <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse shadow-emerald-500/50' : 'bg-red-500'}`} />
                <span className="text-[11px] font-semibold text-slate-400">
                  {socketConnected ? 'Stellar Sockets Active' : 'Sockets Offline'}
                </span>
              </div>
            )}

            {/* Navigation Tabs for Advisors */}
            {['lead_astrologer', 'super_admin', 'junior_astrologer'].includes(userRole || '') && (
              <div className="flex flex-col gap-1 mt-4 border-t border-[#C5A059]/10 pt-4">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'schedule' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'text-slate-400 hover:bg-[#1F2833]'
                  }`}
                >
                  Consultation Feeds
                </button>
                <button
                  onClick={() => setActiveTab('directory')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'directory' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'text-slate-400 hover:bg-[#1F2833]'
                  }`}
                >
                  Client Ledger
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#C5A059]/10 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#F5F5F7] truncate max-w-[120px]">{userName || 'Active User'}</p>
              <span className="text-[9px] text-slate-500">Secure Session</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-[#0B0C10]/80 border border-[#1F2833] hover:border-red-500/30 text-slate-400 hover:text-red-400 transition"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <section className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* Dynamic socket notification */}
        {newAppointmentAlert && (
          <div className="p-4 bg-[#4EA8DE]/10 border border-[#4EA8DE]/30 text-[#4EA8DE] rounded-2xl flex items-center justify-between animate-bounce shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-sm font-semibold">{newAppointmentAlert}</span>
            </div>
            <button onClick={() => setNewAppointmentAlert(null)} className="text-xs hover:underline">Dismiss</button>
          </div>
        )}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1F2833] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#F5F5F7]">AstroCRM Dashboard</h1>
            <p className="text-xs text-slate-400">Verifying role claims, scheduling overlaps, and sanitizing consult journals.</p>
          </div>

          <button
            onClick={() => token && fetchSchedule(token)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#1F2833] border border-[#C5A059]/20 hover:border-[#C5A059]/50 text-xs px-5 py-2.5 rounded-xl text-slate-200 transition disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            <span>Synchronize Feed</span>
          </button>
        </header>

        {/* ==================== ASTROLOGER / ADVISOR PANEL ==================== */}
        {['lead_astrologer', 'super_admin', 'junior_astrologer'].includes(userRole || '') && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* COLUMN 1 (3/5 width on lg): Tab views */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* LIVE waiting room alert banners for astrologers */}
              {waitingRoomAlerts.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Virtual Waiting Room queue:</span>
                  {waitingRoomAlerts.map((alert) => (
                    <div key={alert.clientId} className="flex justify-between items-center bg-[#0B0C10]/40 p-2.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-300">
                      <span>🔮 client <strong className="text-white">{alert.clientName}</strong> is waiting online!</span>
                      <button
                        onClick={() => setWaitingRoomAlerts((prev) => prev.filter((a) => a.clientId !== alert.clientId))}
                        className="text-[10px] bg-emerald-500 text-slate-900 font-bold px-2 py-0.5 rounded hover:bg-emerald-400"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'schedule' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C5A059]">Active Schedules</h3>
                    <span className="text-[10px] text-slate-500">{appointments.length} Consultations</span>
                  </div>

                  {loading && (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-[#1F2833]/40 border border-[#C5A059]/10 rounded-2xl p-5 animate-pulse space-y-4">
                          <div className="flex justify-between">
                            <div className="w-1/3 h-5 bg-slate-800 rounded" />
                            <div className="w-20 h-5 bg-slate-800 rounded" />
                          </div>
                          <div className="w-1/2 h-4 bg-slate-800 rounded" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!loading && error && (
                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-center text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {!loading && !error && appointments.length === 0 && (
                    <div className="p-12 bg-[#1F2833]/30 border border-[#C5A059]/5 rounded-3xl text-center text-xs text-slate-500">
                      No sessions currently scheduled.
                    </div>
                  )}

                  {!loading && !error && appointments.length > 0 && (
                    <div className="space-y-4">
                      {appointments.map((appt) => {
                        const { date, time } = formatDateTime(appt.scheduled_at);
                        const isSelected = selectedAppointment?.id === appt.id;
                        
                        return (
                          <div
                            key={appt.id}
                            onClick={() => {
                              setSelectedAppointment(appt);
                              fetchBirthProfile(appt.client_id);
                              setGrantSuccessMsg(null);
                              setGrantErrorMsg(null);
                            }}
                            className={`p-5 rounded-2xl border transition duration-300 cursor-pointer flex flex-col md:flex-row justify-between gap-4 ${
                              isSelected 
                                ? 'bg-[#1F2833] border-[#C5A059] shadow-xl' 
                                : 'bg-[#1F2833]/50 border-[#1F2833] hover:border-[#C5A059]/30'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[#0B0C10] border border-[#C5A059]/20 text-[#C5A059] flex items-center justify-center font-bold shrink-0">
                                {appt.client_name ? appt.client_name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div>
                                <h4 className="font-bold text-[#F5F5F7]">{appt.client_name}</h4>
                                <p className="text-xs text-slate-500 mb-2">{appt.client_email}</p>
                                <div className="flex items-center gap-2 text-[11px] text-[#4EA8DE]">
                                  <span>📅 {date} • {time}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex md:flex-col justify-between items-end gap-3 self-stretch shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                appt.status === 'scheduled' 
                                  ? 'bg-[#4EA8DE]/10 text-[#4EA8DE] border-[#4EA8DE]/20 animate-pulse' 
                                  : 'bg-slate-900 text-slate-500 border-slate-800'
                              }`}>
                                {appt.status}
                              </span>

                              {appt.note_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (appt.note_id) handleInspectNote(appt.note_id);
                                  }}
                                  className="text-[10px] bg-[#0B0C10] border border-[#C5A059]/30 hover:border-[#C5A059] px-3 py-1.5 rounded-lg text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0B0C10] transition font-bold"
                                >
                                  Inspect Note
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* CLIENT LEDGER DIRECTORY SEARCH TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C5A059]">Client directory ledger</h3>
                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Search clients..."
                        className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600"
                        value={directorySearch}
                        onChange={(e) => {
                          setDirectorySearch(e.target.value);
                          setDirectoryPage(1);
                        }}
                      />
                    </div>
                  </div>

                  {loadingDirectory ? (
                    <div className="text-center py-8 text-xs text-[#4EA8DE] animate-pulse">Querying CRM database...</div>
                  ) : directoryClients.length === 0 ? (
                    <div className="p-8 bg-[#1F2833]/30 border border-[#1F2833] rounded-2xl text-center text-xs text-slate-500">
                      No clients found matching criteria.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {directoryClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => {
                            // Seed selected appointment payload for profile display
                            setSelectedAppointment({
                              id: '',
                              client_id: client.id,
                              astrologer_id: userId || '',
                              scheduled_at: new Date().toISOString(),
                              status: 'scheduled',
                              client_name: client.name,
                              client_email: client.email
                            });
                            fetchBirthProfile(client.id);
                          }}
                          className="p-4 bg-[#1F2833]/40 border border-[#1F2833] hover:border-[#C5A059]/40 rounded-xl transition cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <strong className="text-slate-200 block text-sm">{client.name}</strong>
                            <span className="text-slate-500">{client.email}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#C5A059] block">Total: {client.total_sessions} Consults</span>
                            <span className="text-slate-500 text-[10px]">
                              Last: {client.last_consultation_at ? new Date(client.last_consultation_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Pagination footer */}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          disabled={directoryPage <= 1}
                          onClick={() => setDirectoryPage((p) => p - 1)}
                          className="bg-[#1F2833] px-3 py-1 rounded text-[11px] disabled:opacity-30"
                        >
                          Prev
                        </button>
                        <span className="text-[11px] text-slate-500">Page {directoryPage} of {directoryTotalPages}</span>
                        <button
                          disabled={directoryPage >= directoryTotalPages}
                          onClick={() => setDirectoryPage((p) => p + 1)}
                          className="bg-[#1F2833] px-3 py-1 rounded text-[11px] disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COLUMN 2 (2/5 width on lg): Birth profile and Notes editor panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Selected client Birth Profile Chart */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/10 rounded-3xl p-6 min-h-[300px] flex flex-col justify-between">
                {loadingProfile ? (
                  <div className="space-y-4 my-auto animate-pulse">
                    <div className="h-6 bg-slate-800 rounded w-1/2 mx-auto" />
                    <div className="h-32 bg-slate-800 rounded w-full" />
                  </div>
                ) : !selectedAppointment ? (
                  <div className="my-auto text-center space-y-3 py-8">
                    <div className="text-[#4EA8DE]/20 inline-block">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" strokeWidth="1" strokeDasharray="4 4" />
                        <circle cx="12" cy="12" r="5" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-400">Select Client to Load Grid</h4>
                    <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                      Displays coordinates and unlocks consult note editor forms.
                    </p>
                  </div>
                ) : birthProfile ? (
                  <div className="space-y-6">
                    <div className="border-b border-[#C5A059]/10 pb-4">
                      <span className="text-[9px] uppercase tracking-widest text-[#C5A059] font-bold">Planetary Matrix</span>
                      <h3 className="text-lg font-bold text-[#F5F5F7]">{selectedAppointment.client_name}</h3>
                      <p className="text-[10px] text-slate-400">Born: {birthProfile.birth_date} @ {birthProfile.birth_time} in {birthProfile.birth_place}</p>
                      <div className="mt-2 text-xs font-semibold text-[#4EA8DE] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4EA8DE]" />
                        <span>Ascendant: {birthProfile.planetary_positions.calculatedAscendant}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {birthProfile.planetary_positions.planetaryPositions.map((planet) => (
                        <div
                          key={planet.name}
                          className="bg-[#0B0C10]/60 border border-[#1F2833] rounded-xl p-2.5 flex flex-col justify-between hover:border-[#4EA8DE]/45 transition"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-300">{planet.name}</span>
                            {planet.isRetrograde && (
                              <span className="text-[8px] bg-red-950 text-red-400 px-1 rounded font-bold uppercase">Retro</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#4EA8DE] font-semibold">{planet.zodiacSign}</div>
                          <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                            <span>H: {planet.house}</span>
                            <span>{planet.degree}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 my-auto">
                    <div className="text-center mb-2">
                      <span className="text-amber-500 text-xs font-bold uppercase tracking-widest block mb-1">Coordinates Unaligned</span>
                      <p className="text-[11px] text-slate-500">No birth profile has been initialized for this client. Save details to calculate matrix.</p>
                    </div>

                    <form onSubmit={handleSaveBirthProfile} className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Date</label>
                        <input
                          type="date"
                          required
                          className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Time</label>
                        <input
                          type="time"
                          required
                          className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                          value={birthTime}
                          onChange={(e) => setBirthTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Place / Location</label>
                        <input
                          type="text"
                          required
                          placeholder="Varanasi, India"
                          className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600"
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="w-full bg-[#C5A059] text-[#0B0C10] font-bold py-2 rounded-lg text-xs hover:bg-[#d6b068] transition"
                      >
                        {savingProfile ? 'Calculating Alignment...' : 'Calculate & Save Matrix'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Consultation Note Editor panel */}
              {selectedAppointment && selectedAppointment.id && ['lead_astrologer', 'super_admin'].includes(userRole || '') && (
                <div className="bg-[#1F2833]/50 border border-[#C5A059]/15 rounded-3xl p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F7]">Spiritual Consultation Log</h4>
                    <p className="text-[10px] text-slate-500">Record astrological alignments and observations for this session.</p>
                  </div>

                  <form onSubmit={handleSaveConsultationNote} className="space-y-3">
                    <textarea
                      required
                      placeholder="Consultation notes... (Include client details to test the PII note scrubber)"
                      className="w-full h-24 bg-[#0B0C10] border border-[#1F2833] rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                    />

                    <button
                      type="submit"
                      disabled={savingNote}
                      className="w-full bg-[#C5A059] text-[#0B0C10] font-bold py-2 rounded-xl text-xs hover:bg-[#d6b068] transition"
                    >
                      {savingNote ? 'Encrypting & Logging...' : 'Persist consultation details'}
                    </button>
                  </form>

                  {noteSaveMsg && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                      {noteSaveMsg}
                    </div>
                  )}
                </div>
              )}

              {/* ABAC Referral Access Grant Panel */}
              {selectedAppointment && ['lead_astrologer', 'super_admin'].includes(userRole || '') && (
                <div className="bg-[#1F2833]/50 border border-[#C5A059]/15 rounded-3xl p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
                      <span>Authorize Cross-Referral (ABAC)</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Grant temporary unmasked consultation notes access to another advisor UUID.
                    </p>
                  </div>

                  <form onSubmit={handleGrantReferral} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Recipient Advisor UUID</label>
                      <input
                        type="text"
                        required
                        placeholder="Paste target advisor UUID here"
                        className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono"
                        value={referralTargetId}
                        onChange={(e) => setReferralTargetId(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Duration (Seconds)</label>
                        <input
                          type="number"
                          required
                          min="60"
                          max="86400"
                          className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                          value={referralDuration}
                          onChange={(e) => setReferralDuration(Number(e.target.value))}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={grantingReferral}
                        className="self-end bg-[#4EA8DE] hover:bg-[#3ca3dc] text-[#0B0C10] font-bold py-2 rounded-lg text-xs transition disabled:opacity-50"
                      >
                        {grantingReferral ? 'Authorizing...' : 'Authorize Handoff'}
                      </button>
                    </div>
                  </form>

                  {grantSuccessMsg && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                      {grantSuccessMsg}
                    </div>
                  )}
                  {grantErrorMsg && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg">
                      {grantErrorMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SPIRITUAL CLIENT PANEL ==================== */}
        {userRole === 'client' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* COLUMN 1: Client Birth settings, 기다림 대기실 (Join waiting room) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Virtual waiting room activation block */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/20 rounded-3xl p-6 space-y-4 text-center">
                <span className="p-3 rounded-full bg-[#4EA8DE]/10 text-[#4EA8DE] inline-flex border border-[#4EA8DE]/30 animate-pulse">
                  🔮
                </span>
                <div>
                  <h3 className="font-bold text-[#F5F5F7] text-lg">Virtual Waiting Room</h3>
                  <p className="text-xs text-slate-400 mt-1">Let advisors know you are online and ready for your spiritual session.</p>
                </div>

                <button
                  onClick={handleJoinWaitingRoom}
                  className="w-full py-3 bg-gradient-to-r from-[#4EA8DE] to-[#51b6ef] text-[#0B0C10] font-bold rounded-xl text-xs hover:brightness-110 shadow-lg shadow-cyan-950/50 transition active:scale-95"
                >
                  Join Virtual Waiting Room
                </button>

                {waitingRoomStatus && (
                  <div className="p-3 bg-[#4EA8DE]/10 border border-[#4EA8DE]/35 text-[#4EA8DE] text-xs rounded-xl">
                    {waitingRoomStatus}
                  </div>
                )}
              </div>

              {/* Birth Settings updates form */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/10 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-200">Birth Coordinates Settings</h3>
                  <p className="text-xs text-slate-500">Provide exact parameters to calibrate planetary placements.</p>
                </div>

                <form onSubmit={handleSaveBirthProfile} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Date</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Time</label>
                    <input
                      type="time"
                      required
                      className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Birth Place / Location</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full bg-[#C5A059] text-[#0B0C10] font-bold py-2 rounded-xl text-xs hover:bg-[#d6b068] transition"
                  >
                    {savingProfile ? 'Updating Celestial Chart...' : 'Update Natal Coordinates'}
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 2: Natal planetary matrix & appointment schedules / booking slots */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Client own planetary grid */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/10 rounded-3xl p-6">
                <span className="text-[10px] uppercase font-bold text-[#C5A059] block mb-1">Calculated Natal Chart</span>
                <h3 className="text-xl font-bold text-slate-100 mb-4">Planetary coordinates</h3>
                
                {loadingProfile ? (
                  <div className="py-12 text-center text-xs animate-pulse text-[#4EA8DE]">Plotting coordinates...</div>
                ) : !birthProfile ? (
                  <div className="py-8 text-center text-xs text-slate-500">Provide settings data to render natal grids.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {birthProfile.planetary_positions.planetaryPositions.map((planet) => (
                      <div key={planet.name} className="p-3 bg-[#0B0C10]/70 border border-[#1F2833] rounded-xl hover:border-[#4EA8DE]/30 transition">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">{planet.name}</span>
                        <strong className="text-slate-200 block text-xs mt-0.5">{planet.zodiacSign}</strong>
                        <span className="text-[10px] text-[#4EA8DE]">{planet.degree}° (House {planet.house})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal consultations lists */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/10 rounded-3xl p-6">
                <span className="text-[10px] uppercase font-bold text-[#C5A059] block mb-1">Spiritual Alignments</span>
                <h3 className="text-xl font-bold text-slate-100 mb-4">My scheduled sessions</h3>

                {loading ? (
                  <div className="py-6 text-center text-xs text-[#4EA8DE] animate-pulse">Checking records...</div>
                ) : appointments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No scheduled sessions. Book a slot below.</div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appt) => {
                      const { date, time } = formatDateTime(appt.scheduled_at);
                      return (
                        <div key={appt.id} className="p-4 bg-[#0B0C10]/40 border border-[#1F2833] rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <strong className="text-slate-200 block">Consultation with {appt.client_name || 'Advisor'}</strong>
                            <span className="text-[#4EA8DE] text-[10px]">📅 {date} @ {time}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">
                            {appt.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Strict overlap slot booking component */}
              <div className="bg-[#1F2833]/50 border border-[#C5A059]/15 rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-200">Reserve consultation slot</h3>
                  <p className="text-xs text-slate-500">Booking algorithm enforces 15-minute buffers to prevent overlapping schedules.</p>
                </div>

                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Choose Astrologer Advisor</label>
                      {astrologers.length === 0 ? (
                        <select className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-500" disabled>
                          <option>Loading advisors...</option>
                        </select>
                      ) : (
                        <select
                          className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                          value={bookAstrologerId}
                          onChange={(e) => setBookAstrologerId(e.target.value)}
                        >
                          {astrologers.map((ast) => (
                            <option key={ast.id} value={ast.id}>{ast.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mb-1">Appointment Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full bg-[#0B0C10] border border-[#1F2833] rounded-lg px-3 py-2 text-xs text-slate-200"
                        value={bookScheduledAt}
                        onChange={(e) => setBookScheduledAt(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBooking}
                    className="w-full py-2.5 bg-[#C5A059] hover:bg-[#d6b068] text-[#0B0C10] font-bold rounded-xl text-xs transition"
                  >
                    {isBooking ? 'Validating slot availability...' : 'Lock Consult Reservation'}
                  </button>

                  {bookingSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                      {bookingSuccess}
                    </div>
                  )}

                  {bookingError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                      {bookingError}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CORPORATE FINANCE PANEL ==================== */}
        {userRole === 'finance_officer' && (
          <div className="space-y-6">
            <div className="p-8 bg-[#1F2833]/40 border border-amber-500/20 rounded-3xl text-center space-y-4">
              <span className="p-3 rounded-full bg-amber-500/10 text-amber-400 inline-flex border border-amber-500/20">
                💰
              </span>
              <h2 className="text-xl font-bold text-slate-100">Financial Ledger Operations</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Spiritual consultation calendars and birth parameters are restricted under standard compliance policy. Audit logs statistics are visible below.
              </p>
            </div>

            <div className="bg-[#1F2833]/40 border border-[#1F2833] rounded-2xl p-6 space-y-3">
              <h4 className="text-xs font-semibold text-[#C5A059] uppercase tracking-wider">Security and Compliance Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div className="p-4 bg-[#0B0C10]/40 rounded-xl border border-[#1F2833]">
                  <span className="text-slate-500 block">General Ledger Status</span>
                  <strong className="text-emerald-400 block text-sm mt-1">Balanced & Secured</strong>
                </div>
                <div className="p-4 bg-[#0B0C10]/40 rounded-xl border border-[#1F2833]">
                  <span className="text-slate-500 block">Compliance Audit Logs</span>
                  <strong className="text-slate-200 block text-sm mt-1">Tamper Evident Active</strong>
                </div>
                <div className="p-4 bg-[#0B0C10]/40 rounded-xl border border-[#1F2833]">
                  <span className="text-slate-500 block">Referral Security Matrix</span>
                  <strong className="text-slate-200 block text-sm mt-1">ABAC Policy Active</strong>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* 3. NOTE INSPECTOR DIALOG MODAL */}
      {inspectingNoteId && (
        <div className="fixed inset-0 z-50 bg-[#0B0C10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1F2833] border border-[#C5A059]/40 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#C5A059]/10 pb-3">
              <div>
                <h3 className="font-bold text-slate-100">Consultation Note</h3>
                <span className="text-[10px] text-slate-400">Security Clearance Checker</span>
              </div>
              <button
                onClick={() => setInspectingNoteId(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Clearance Alert Banner */}
            {noteRoleClearance && (
              <div className={`p-3 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                noteRoleClearance === 'raw' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : noteRoleClearance === 'denied'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                    : 'bg-amber-500/10 text-[#C5A059] border-[#C5A059]/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  noteRoleClearance === 'raw' 
                    ? 'bg-emerald-400' 
                    : noteRoleClearance === 'denied'
                      ? 'bg-red-400'
                      : 'bg-[#C5A059]'
                }`} />
                <span>
                  {noteRoleClearance === 'raw' 
                    ? 'Security Clearance: HIGH (Raw data decryption approved)'
                    : noteRoleClearance === 'denied'
                      ? 'Security Clearance: RESTRICTED (Action Denied by RBAC Policy)'
                      : 'Security Clearance: RESTRICTED (PII Obfuscation applied)'
                  }
                </span>
              </div>
            )}

            {/* Note Text */}
            <div className={`bg-[#0B0C10]/60 border border-[#1F2833] rounded-2xl p-4 min-h-[120px] max-h-[250px] overflow-y-auto text-xs leading-relaxed font-mono ${
              noteRoleClearance === 'denied' ? 'text-red-400 border-red-500/20' : 'text-slate-300'
            }`}>
              {loadingNote ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <svg className="animate-spin h-5 w-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Decrypting note payload...</span>
                </div>
              ) : (
                <p>{activeNoteText}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingNoteId(null)}
                className="bg-[#C5A059] hover:bg-[#d6b068] text-[#0B0C10] font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Close Note
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
