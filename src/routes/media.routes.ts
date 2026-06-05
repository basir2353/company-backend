import { Router, Response } from 'express';
import path from 'path';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';
import { env } from '../config/env';
import { paramId } from '../utils/helpers';
import { normalizeMediaUrl, serializeMediaRecord } from '../utils/media-url';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      prisma.media.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.media.count(),
    ]);

    res.json({
      media: media.map(serializeMediaRecord),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  '/upload',
  authenticate,
  authorize(Role.EDITOR),
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const url = `/uploads/${req.file.filename}`;

    const media = await prisma.media.create({
      data: {
        filename: req.file.originalname,
        url,
        mimeType: req.file.mimetype,
        size: req.file.size,
        alt: (req.body.alt as string) || req.file.originalname,
        uploadedBy: req.user?.userId,
      },
    });

    res.status(201).json({ media: serializeMediaRecord(media) });
  }),
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const data = z
      .object({ alt: z.string().optional(), filename: z.string().optional() })
      .parse(req.body);
    const media = await prisma.media.update({ where: { id: paramId(req.params.id) }, data });
    res.json({ media });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: paramId(req.params.id) } });
    if (!media) throw new ApiError(404, 'Media not found');

    const filename = path.basename(media.url);
    const filePath = path.join(env.UPLOAD_DIR, filename);
    try {
      const fs = await import('fs');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // file may already be removed
    }

    await prisma.media.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  }),
);

export default router;
