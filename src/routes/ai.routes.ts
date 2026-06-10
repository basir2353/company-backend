import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { blogAiSchema, runBlogAi } from '../services/blog-ai.service';

const router = Router();

router.post(
  '/blog',
  authenticate,
  authorize(Role.EDITOR),
  asyncHandler(async (req, res) => {
    const body = blogAiSchema.parse(req.body);
    const result = await runBlogAi(body);
    res.json({ ok: true, ...result });
  }),
);

export default router;
