import { UserRole } from './models';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        userName: string;
        role: UserRole;
      };
    }
  }
}

// This file needs to be a module
export {}; 