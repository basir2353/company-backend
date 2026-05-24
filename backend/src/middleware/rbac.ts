import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from './auth';

const roleHierarchy: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function authorize(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = roleHierarchy[req.user.role];
    const hasAccess = allowedRoles.some((role) => userLevel >= roleHierarchy[role]);

    if (!hasAccess) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  authorize(Role.ADMIN)(req, res, next);
}

export function requireEditor(req: AuthRequest, res: Response, next: NextFunction): void {
  authorize(Role.EDITOR)(req, res, next);
}

export function requireViewer(req: AuthRequest, res: Response, next: NextFunction): void {
  authorize(Role.VIEWER)(req, res, next);
}
