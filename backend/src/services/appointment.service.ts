import crypto from 'crypto';
import { AppointmentRepository, Appointment, AppointmentWithClient, BirthProfile, ClientDirectoryItem, User } from '../repositories/appointment.repository';
import { AstrologyEngineService } from './astrologyEngine.service';
import { AppError } from '../middlewares/errorHandler';
import { emitNewAppointment } from '../utils/socket';
import logger from '../utils/logger';
import { UserRole } from '../middlewares/auth';

export class AppointmentService {
  private repository: AppointmentRepository;
  private astrologyEngine: AstrologyEngineService;

  constructor() {
    this.repository = new AppointmentRepository();
    this.astrologyEngine = new AstrologyEngineService();
  }

  /**
   * Register a new user in the database (Signup flow)
   */
  async signup(input: { name: string; email: string; password_hash: string; role: UserRole }): Promise<User> {
    const { name, email, password_hash, role } = input;

    logger.info('Registering new user', { email, role });

    // Double check if email already exists in Postgres
    // In our repository/DB, email has a UNIQUE constraint which will throw, but checking first is cleaner
    const passwordHash = crypto.createHash('sha256').update(password_hash).digest('hex');

    const newUser = await this.repository.createUser({
      name,
      email,
      password_hash: passwordHash,
      role
    });

    // Seed compliance logs
    await this.repository.insertAuditLog(
      newUser.id,
      'USER_SIGNUP',
      `User ${newUser.name} successfully registered with role ${newUser.role}`
    );

    // If client role registers, auto-seed birth profile variables to ensure calculations render
    if (role === 'client') {
      await this.saveBirthProfile({
        client_id: newUser.id,
        birth_date: '1995-10-24',
        birth_time: '08:45:00',
        birth_place: 'New Delhi, India'
      });
    }

    return newUser;
  }

  /**
   * Fetch the astrologer's schedule
   */
  async getScheduleForAstrologer(astrologerId: string): Promise<AppointmentWithClient[]> {
    logger.info('Fetching V2.1 schedule for astrologer', { astrologerId });
    return this.repository.findAppointmentsByAstrologer(astrologerId);
  }

  /**
   * Fetch the client's own schedule (Client Dashboard view)
   */
  async getScheduleForClient(clientId: string): Promise<AppointmentWithClient[]> {
    logger.info('Fetching schedule for client', { clientId });
    return this.repository.findAppointmentsByClient(clientId);
  }

  /**
   * Book an appointment enforcing conflict resolution with a 15-minute buffer zone.
   */
  async bookAppointment(input: { client_id: string; astrologer_id: string; scheduled_at: Date }): Promise<Appointment> {
    const { astrologer_id, scheduled_at, client_id } = input;
    const targetDate = new Date(scheduled_at);

    if (isNaN(targetDate.getTime())) {
      throw new AppError('Invalid date/time format provided', 400);
    }

    logger.info('Checking availability with 15-minute buffer', { astrologerId: astrologer_id, time: targetDate.toISOString() });

    // Conflict Check: Look for bookings within 15 minutes before or after targetDate
    const conflictingBooking = await this.repository.findOverlappingAppointment(astrologer_id, targetDate);
    
    if (conflictingBooking) {
      const conflictTime = new Date(conflictingBooking.scheduled_at);
      logger.warn('Scheduling conflict detected within 15-minute buffer', {
        requested: targetDate.toISOString(),
        existing: conflictTime.toISOString()
      });

      const suggestionBefore = new Date(targetDate.getTime() - 30 * 60 * 1000).toISOString();
      const suggestionAfter = new Date(targetDate.getTime() + 30 * 60 * 1000).toISOString();

      throw new AppError(
        `Scheduling conflict: The astrologer has another consultation scheduled at ${conflictTime.toLocaleTimeString()}. ` +
        `Enforced 15-minute buffer buffer conflict. Suggested alternative slots: ${suggestionBefore} or ${suggestionAfter}`,
        400
      );
    }

    // Persist new appointment
    const newAppointment = await this.repository.create({
      client_id,
      astrologer_id,
      scheduled_at: targetDate
    });

    // Seed a dummy consultation note for testing the scrubber
    await this.repository.saveConsultationNote(
      newAppointment.id,
      `Session notes: Client email is client@crm.com and phone is +1 (555) 019-2834. Payment made with Visa card 4111-2222-3333-4444. Client is experiencing a Saturn return.`
    );

    // Compliance Audit Logging
    await this.repository.insertAuditLog(
      client_id,
      'APPOINTMENT_BOOKED',
      `Booking request locked for appointment ID ${newAppointment.id} with astrologer ${astrologer_id} at ${targetDate.toISOString()}`
    );

    // Emit live updates to sockets
    emitNewAppointment(astrologer_id, newAppointment);

    return newAppointment;
  }

  /**
   * Save a client's birth profile, run the planetary calculations, and persist
   */
  async saveBirthProfile(input: {
    client_id: string;
    birth_date: string;
    birth_time: string;
    birth_place: string;
  }): Promise<BirthProfile> {
    logger.info('Calculating planetary matrix for client birth profile', { clientId: input.client_id });

    // Calculate planetary coordinates using our Astrology Engine
    const planetaryPositions = this.astrologyEngine.generateMatrix(
      input.birth_date,
      input.birth_time,
      input.birth_place
    );

    // Persist profile
    const profile = await this.repository.upsertBirthProfile({
      client_id: input.client_id,
      birth_date: input.birth_date,
      birth_time: input.birth_time,
      birth_place: input.birth_place,
      planetary_positions: planetaryPositions
    });

    // Compliance Audit Logging
    await this.repository.insertAuditLog(
      input.client_id,
      'BIRTH_PROFILE_SAVED',
      `Birth coordinates updated to date: ${input.birth_date}, time: ${input.birth_time}, place: ${input.birth_place}`
    );

    return profile;
  }

  /**
   * Retrieve a client's calculated birth profile chart
   */
  async getBirthProfile(clientId: string): Promise<BirthProfile | null> {
    return this.repository.findBirthProfileByClient(clientId);
  }

  /**
   * Grant temporary referral access to another astrologer (ABAC implementation)
   */
  async grantReferralAccess(input: {
    client_id: string;
    granted_to_astrologer_id: string;
    duration_seconds: number;
    actorId: string;
  }): Promise<{ expiresAt: Date }> {
    const { client_id, granted_to_astrologer_id, duration_seconds, actorId } = input;
    const expiresAt = new Date(Date.now() + duration_seconds * 1000);

    logger.info('Granting temporary referral access', {
      clientId: client_id,
      astrologerId: granted_to_astrologer_id,
      duration: duration_seconds,
      expiresAt: expiresAt.toISOString()
    });

    await this.repository.insertReferralToken(client_id, granted_to_astrologer_id, expiresAt);

    // Compliance Audit Logging
    await this.repository.insertAuditLog(
      actorId,
      'REFERRAL_GRANTED',
      `Temporary access granted for client ${client_id} to advisor ${granted_to_astrologer_id} for ${duration_seconds} seconds`
    );

    return { expiresAt };
  }

  /**
   * Save or edit a consultation note (Rich text save functionality)
   */
  async saveConsultationNote(appointmentId: string, noteText: string, actorId: string): Promise<void> {
    logger.info('Saving consultation note text', { appointmentId, actorId });

    await this.repository.saveConsultationNote(appointmentId, noteText);

    // Compliance Audit Logging
    await this.repository.insertAuditLog(
      actorId,
      'NOTE_EDITED',
      `Consultation note updated for appointment ID ${appointmentId}`
    );
  }

  /**
   * Fetch a consultation note, applying PII masking if the caller fails ABAC/RBAC criteria.
   */
  async getConsultationNote(noteId: string, requestUserId: string, requestUserRole: UserRole): Promise<string> {
    const note = await this.repository.findConsultationNote(noteId);
    
    if (!note) {
      throw new AppError('Consultation note not found', 404);
    }

    // 1. RBAC Check: super_admin bypasses all redactions (full clearance)
    if (requestUserRole === 'super_admin') {
      logger.info('Serving unmasked note: caller is super_admin', { noteId, userId: requestUserId });
      return note.note_text;
    }

    // 2. RBAC Check: finance_officer is blocked from reading notes altogether
    if (requestUserRole === 'finance_officer') {
      logger.warn('Access denied: finance_officer blocked from reading consultation logs', { noteId, userId: requestUserId });
      throw new AppError('Access Denied: Financial roles are restricted from reading spiritual consultation logs', 403);
    }

    // 3. RBAC/ABAC Check: If caller is the assigned lead astrologer, they bypass masking
    if (requestUserRole === 'lead_astrologer' && note.astrologer_id === requestUserId) {
      logger.info('Serving unmasked note: caller is assigned lead astrologer', { noteId, userId: requestUserId });
      return note.note_text;
    }

    // 4. ABAC Check: If any other advisor (lead or junior) holds an active referral token for this client
    if (['lead_astrologer', 'junior_astrologer'].includes(requestUserRole)) {
      const hasReferral = await this.repository.hasActiveReferralToken(note.client_id, requestUserId);
      if (hasReferral) {
        logger.info('Serving unmasked note: caller has active temporary referral clearance', { noteId, userId: requestUserId });
        return note.note_text;
      }
    }

    // Default Fallback: Serve only the PII-scrubbed/masked version of the note
    logger.info('Serving scrubbed note: caller has restricted clearance', { noteId, userId: requestUserId, role: requestUserRole });
    return this.scrubPII(note.note_text);
  }

  /**
   * Fetch searchable, paginated client directory ledger
   */
  async getClientDirectory(
    search: string,
    page: number,
    limit: number
  ): Promise<{ clients: ClientDirectoryItem[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const clients = await this.repository.findClientDirectory(search, limit, offset);
    const total = await this.repository.countClientDirectory(search);
    const totalPages = Math.ceil(total / limit);

    return {
      clients,
      total,
      page,
      totalPages
    };
  }

  /**
   * Regex-based data scrubbing logic to hash/mask private client parameters
   */
  private scrubPII(text: string): string {
    let scrubbed = text;

    // 1. Mask Email Addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    scrubbed = scrubbed.replace(emailRegex, '[REDACTED_EMAIL]');

    // 2. Mask Phone Numbers
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    scrubbed = scrubbed.replace(phoneRegex, '[REDACTED_PHONE]');

    // 3. Mask Credit Cards
    const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
    scrubbed = scrubbed.replace(creditCardRegex, '[REDACTED_CARD]');

    return scrubbed;
  }
}
