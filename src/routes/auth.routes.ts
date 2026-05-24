import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { omitPassword } from '../utils/helpers';

const router = Router();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.nativeEnum(Role).optional(),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ token, user: omitPassword(user) });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user: omitPassword(user) });
  }),
);

router.post(
  '/register',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, 'Email already registered');

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: await hashPassword(data.password),
        role: data.role ?? Role.EDITOR,
      },
    });

    res.status(201).json({ user: omitPassword(user) });
  }),
);

router.get(
  '/users',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ users: users.map(omitPassword) });
  }),
);

export default router;
