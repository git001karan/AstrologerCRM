import { Server as SocketIOServer } from 'socket.io';
import logger from './logger';

let io: SocketIOServer | null = null;

/**
 * Store the initialized Socket.io server instance
 */
export const setIO = (ioInstance: SocketIOServer): void => {
  io = ioInstance;
  logger.info('Socket.io server instance registered in global utility');
};

/**
 * Retrieve the active Socket.io server instance
 */
export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Safely emit a NEW_APPOINTMENT event to all connected clients
 */
export const emitNewAppointment = (astrologerId: string, appointment: any): void => {
  if (io) {
    logger.info('Emitting NEW_APPOINTMENT event via sockets', { astrologerId, appointmentId: appointment.id });
    io.emit('NEW_APPOINTMENT', { astrologerId, appointment });
  } else {
    logger.warn('Socket.io server not initialized. Skipping real-time broadcast.');
  }
};
