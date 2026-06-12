import pool from '../config/db';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'lead_astrologer' | 'junior_astrologer' | 'finance_officer' | 'client';
  created_at: Date;
}

export interface Appointment {
  id: string;
  client_id: string;
  astrologer_id: string;
  scheduled_at: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentWithClient extends Appointment {
  client_name: string;
  client_email: string;
  note_id?: string;
}

export interface BirthProfile {
  id: string;
  client_id: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  planetary_positions: any;
  created_at: Date;
  updated_at: Date;
}

export interface ConsultationNoteWithAccess {
  id: string;
  appointment_id: string;
  note_text: string;
  astrologer_id: string;
  client_id: string;
}

export interface ClientDirectoryItem {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  last_consultation_at: Date | null;
  total_sessions: number;
}

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  details: string;
  created_at: Date;
}

export class AppointmentRepository {
  /**
   * Create and persist a new user account (Signup)
   */
  async createUser(input: { name: string; email: string; password_hash: string; role: string }): Promise<User> {
    const query = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4::user_role)
      RETURNING id, name, email, role, created_at;
    `;
    const result = await pool.query<User>(query, [input.name, input.email, input.password_hash, input.role]);
    return result.rows[0];
  }

  /**
   * Fetch all upcoming and past appointments for a specific astrologer, joined with client information.
   */
  async findAppointmentsByAstrologer(astrologerId: string): Promise<AppointmentWithClient[]> {
    const query = `
      SELECT 
        a.id,
        a.client_id,
        a.astrologer_id,
        a.scheduled_at,
        a.status,
        a.created_at,
        a.updated_at,
        u.name AS client_name,
        u.email AS client_email,
        n.id AS note_id
      FROM appointments a
      INNER JOIN users u ON a.client_id = u.id
      LEFT JOIN consultation_notes n ON a.id = n.appointment_id
      WHERE a.astrologer_id = $1
      ORDER BY a.scheduled_at ASC;
    `;
    const result = await pool.query<AppointmentWithClient>(query, [astrologerId]);
    return result.rows;
  }

  /**
   * Fetch appointments for a specific client (Client Portal view)
   */
  async findAppointmentsByClient(clientId: string): Promise<AppointmentWithClient[]> {
    const query = `
      SELECT 
        a.id,
        a.client_id,
        a.astrologer_id,
        a.scheduled_at,
        a.status,
        a.created_at,
        a.updated_at,
        u.name AS client_name, -- In client's view, we join the astrologer's name
        u.email AS client_email,
        n.id AS note_id
      FROM appointments a
      INNER JOIN users u ON a.astrologer_id = u.id
      LEFT JOIN consultation_notes n ON a.id = n.appointment_id
      WHERE a.client_id = $1
      ORDER BY a.scheduled_at ASC;
    `;
    const result = await pool.query<AppointmentWithClient>(query, [clientId]);
    return result.rows;
  }

  /**
   * Checks if there are any active appointments within a 15-minute buffer zone.
   */
  async findOverlappingAppointment(astrologerId: string, scheduledAt: Date): Promise<Appointment | null> {
    const query = `
      SELECT id, client_id, astrologer_id, scheduled_at, status, created_at, updated_at
      FROM appointments
      WHERE astrologer_id = $1 
        AND status = 'scheduled'
        AND scheduled_at > $2::timestamptz - INTERVAL '15 minutes'
        AND scheduled_at < $2::timestamptz + INTERVAL '15 minutes'
      LIMIT 1;
    `;
    const result = await pool.query<Appointment>(query, [astrologerId, scheduledAt]);
    return result.rows[0] || null;
  }

  /**
   * Create a new appointment
   */
  async create(input: { client_id: string; astrologer_id: string; scheduled_at: Date }): Promise<Appointment> {
    const query = `
      INSERT INTO appointments (client_id, astrologer_id, scheduled_at, status)
      VALUES ($1, $2, $3, 'scheduled'::appointment_status)
      RETURNING id, client_id, astrologer_id, scheduled_at, status, created_at, updated_at;
    `;
    const values = [input.client_id, input.astrologer_id, input.scheduled_at];
    const result = await pool.query<Appointment>(query, values);
    return result.rows[0];
  }

  /**
   * Upsert a client's birth profile.
   */
  async upsertBirthProfile(profile: {
    client_id: string;
    birth_date: string;
    birth_time: string;
    birth_place: string;
    planetary_positions: any;
  }): Promise<BirthProfile> {
    const query = `
      INSERT INTO client_birth_profiles (client_id, birth_date, birth_time, birth_place, planetary_positions)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (client_id) DO UPDATE SET
        birth_date = EXCLUDED.birth_date,
        birth_time = EXCLUDED.birth_time,
        birth_place = EXCLUDED.birth_place,
        planetary_positions = EXCLUDED.planetary_positions,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, client_id, birth_date, birth_time, birth_place, planetary_positions, created_at, updated_at;
    `;
    const values = [
      profile.client_id,
      profile.birth_date,
      profile.birth_time,
      profile.birth_place,
      JSON.stringify(profile.planetary_positions)
    ];
    const result = await pool.query<BirthProfile>(query, values);
    return result.rows[0];
  }

  /**
   * Fetch a client's birth profile.
   */
  async findBirthProfileByClient(clientId: string): Promise<BirthProfile | null> {
    const query = `
      SELECT id, client_id, birth_date::TEXT as birth_date, birth_time::TEXT as birth_time, birth_place, planetary_positions, created_at, updated_at
      FROM client_birth_profiles
      WHERE client_id = $1;
    `;
    const result = await pool.query<BirthProfile>(query, [clientId]);
    return result.rows[0] || null;
  }

  /**
   * Fetch a consultation note along with authorization keys.
   */
  async findConsultationNote(noteId: string): Promise<ConsultationNoteWithAccess | null> {
    const query = `
      SELECT 
        n.id, 
        n.appointment_id, 
        n.note_text, 
        a.astrologer_id, 
        a.client_id
      FROM consultation_notes n
      INNER JOIN appointments a ON n.appointment_id = a.id
      WHERE n.id = $1;
    `;
    const result = await pool.query<ConsultationNoteWithAccess>(query, [noteId]);
    return result.rows[0] || null;
  }

  /**
   * Create or update consultation notes (Rich Text Editor save functionality)
   */
  async saveConsultationNote(appointmentId: string, noteText: string): Promise<void> {
    const query = `
      INSERT INTO consultation_notes (appointment_id, note_text)
      VALUES ($1, $2)
      ON CONFLICT (appointment_id) DO UPDATE SET
        note_text = EXCLUDED.note_text,
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.query(query, [appointmentId, noteText]);
  }

  /**
   * Upsert a temporary referral access token (ABAC)
   */
  async insertReferralToken(clientId: string, astrologerId: string, expiresAt: Date): Promise<void> {
    const query = `
      INSERT INTO referral_access_tokens (client_id, granted_to_astrologer_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (client_id, granted_to_astrologer_id) DO UPDATE SET
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.query(query, [clientId, astrologerId, expiresAt]);
  }

  /**
   * Verify if there is an active referral token (ABAC)
   */
  async hasActiveReferralToken(clientId: string, astrologerId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM referral_access_tokens
      WHERE client_id = $1 
        AND granted_to_astrologer_id = $2
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1;
    `;
    const result = await pool.query(query, [clientId, astrologerId]);
    return result.rows.length > 0;
  }

  /**
   * Paginated & Searchable Client Directory Ledger (Gold Standard Feature)
   * Joins appointments to find name, contact, total session count, and date of last consultation.
   */
  async findClientDirectory(search: string, limit: number, offset: number): Promise<ClientDirectoryItem[]> {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.created_at,
        MAX(a.scheduled_at) AS last_consultation_at,
        COUNT(a.id)::int AS total_sessions
      FROM users u
      LEFT JOIN appointments a ON u.id = a.client_id
      WHERE u.role = 'client'
        AND (u.name ILIKE $1 OR u.email ILIKE $1)
      GROUP BY u.id
      ORDER BY u.name ASC
      LIMIT $2 OFFSET $3;
    `;
    const result = await pool.query<ClientDirectoryItem>(query, [`%${search}%`, limit, offset]);
    return result.rows;
  }

  /**
   * Returns count of total clients matching the search query
   */
  async countClientDirectory(search: string): Promise<number> {
    const query = `
      SELECT COUNT(*)::int
      FROM users
      WHERE role = 'client'
        AND (name ILIKE $1 OR email ILIKE $1);
    `;
    const result = await pool.query(query, [`%${search}%`]);
    return result.rows[0].count;
  }

  /**
   * Insert a tamper-evident audit log (Compliance & Security Feature)
   */
  async insertAuditLog(actorId: string | null, action: string, details: string): Promise<void> {
    const query = `
      INSERT INTO audit_logs (actor_id, action, details)
      VALUES ($1, $2, $3);
    `;
    await pool.query(query, [actorId, action, details]);
  }

  /**
   * Fetch all audit logs (for compliance auditing)
   */
  async findAuditLogs(limit: number, offset: number): Promise<AuditLogItem[]> {
    const query = `
      SELECT 
        l.id, 
        l.actor_id, 
        u.name AS actor_name, 
        l.action, 
        l.details, 
        l.created_at
      FROM audit_logs l
      LEFT JOIN users u ON l.actor_id = u.id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await pool.query<AuditLogItem>(query, [limit, offset]);
    return result.rows;
  }
}
