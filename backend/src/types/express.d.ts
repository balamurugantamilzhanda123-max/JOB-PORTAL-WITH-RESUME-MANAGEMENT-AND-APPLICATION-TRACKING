import { SafeUser } from '../types/api';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionId?: string;
    }
  }
}

export {};

