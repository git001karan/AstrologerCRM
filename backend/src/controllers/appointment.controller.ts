import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { UserRole } from '../middlewares/auth';

export class AppointmentController {
  private service: AppointmentService;

  constructor() {
    this.service = new AppointmentService();
  }

  /**
   * Fetch the currently authenticated astrologer's schedule
   * GET /api/appointments/my-schedule
   */
  getMySchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized credentials', status: 401 });
        return;
      }

      let schedule;
      if (userRole === 'client') {
        schedule = await this.service.getScheduleForClient(userId);
      } else {
        schedule = await this.service.getScheduleForAstrologer(userId);
      }

      res.status(200).json({
        success: true,
        data: schedule,
        status: 200
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Book a new appointment
   * POST /api/appointments/book
   */
  bookAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client_id = req.user?.id || req.body.client_id;
      const { astrologer_id, scheduled_at } = req.body;

      if (!client_id) {
        res.status(400).json({ success: false, error: 'Client ID is required to book an appointment', status: 400 });
        return;
      }

      const newAppointment = await this.service.bookAppointment({
        client_id,
        astrologer_id,
        scheduled_at: new Date(scheduled_at)
      });

      res.status(201).json({
        success: true,
        data: newAppointment,
        status: 201
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save client birth details and calculate planetary matrices
   * POST /api/astrology/profile
   */
  saveBirthProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client_id = req.user?.id;
      const { birth_date, birth_time, birth_place } = req.body;

      if (!client_id) {
        res.status(401).json({ success: false, error: 'Authentication required to save birth profile', status: 401 });
        return;
      }

      const profile = await this.service.saveBirthProfile({
        client_id,
        birth_date,
        birth_time,
        birth_place
      });

      res.status(201).json({
        success: true,
        data: profile,
        status: 201
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve a client's birth profile and calculation logs
   * GET /api/astrology/profile/:clientId
   */
  getBirthProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = req.params.clientId || req.user?.id;
      
      if (!clientId) {
        res.status(400).json({ success: false, error: 'Client ID parameter is required', status: 400 });
        return;
      }

      const profile = await this.service.getBirthProfile(clientId);
      res.status(200).json({
        success: true,
        data: profile,
        status: 200
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fetch consultation log notes with dynamic PII masking depending on reader role (ABAC & RBAC)
   * GET /api/appointments/notes/:id
   */
  getConsultationNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const noteId = req.params.id;
      const requestUserId = req.user?.id;
      const requestUserRole = req.user?.role as UserRole;

      if (!requestUserId || !requestUserRole) {
        res.status(401).json({ success: false, error: 'Authentication required to access consultation notes', status: 401 });
        return;
      }

      const noteText = await this.service.getConsultationNote(noteId, requestUserId, requestUserRole);
      
      res.status(200).json({
        success: true,
        noteText,
        status: 200
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Grant temporary referral access to another advisor (ABAC)
   * POST /api/astrology/referral
   */
  grantReferralAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Only Lead Astrologers, Super Admins, or the Client themselves can authorize sharing
      const callerRole = req.user?.role;
      const actorId = req.user?.id;
      if (!callerRole || !['lead_astrologer', 'super_admin', 'client'].includes(callerRole) || !actorId) {
        res.status(403).json({ success: false, error: 'Access Denied: Only Lead Astrologers, Super Admins, or the client themselves can authorize cross-referral access', status: 403 });
        return;
      }

      const { client_id, granted_to_astrologer_id, duration_seconds } = req.body;

      const result = await this.service.grantReferralAccess({
        client_id,
        granted_to_astrologer_id,
        duration_seconds,
        actorId
      });

      res.status(201).json({
        success: true,
        data: result,
        status: 201
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register a new user client-side or admin-side (Signup)
   * POST /api/auth/signup
   */
  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;
      const newUser = await this.service.signup({
        name,
        email,
        password_hash: password, // Service hashes it using SHA-256
        role: role || 'client'
      });

      res.status(201).json({
        success: true,
        data: newUser,
        status: 201
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save or edit consultation notes for a spiritual session (Rich Text persistence)
   * POST /api/appointments/notes
   */
  saveConsultationNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorId = req.user?.id;
      const callerRole = req.user?.role;
      if (!actorId || !callerRole || !['lead_astrologer', 'super_admin'].includes(callerRole)) {
        res.status(403).json({ success: false, error: 'Access Denied: Only Lead Astrologers or Super Admins can write consultation logs', status: 403 });
        return;
      }

      const { appointment_id, note_text } = req.body;
      await this.service.saveConsultationNote(appointment_id, note_text, actorId);

      res.status(200).json({
        success: true,
        message: 'Consultation note has been saved successfully',
        status: 200
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search and filter client directories dynamically with offsets
   * GET /api/clients/directory
   */
  getClientDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const callerRole = req.user?.role;
      if (!callerRole || !['super_admin', 'lead_astrologer', 'junior_astrologer'].includes(callerRole)) {
        res.status(403).json({ success: false, error: 'Access Denied: Spiritual advisors only', status: 403 });
        return;
      }

      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const data = await this.service.getClientDirectory(search, page, limit);

      res.status(200).json({
        success: true,
        data,
        status: 200
      });
    } catch (error) {
      next(error);
    }
  };
}
