import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import blogRoutes from './routes/blog.routes';
import portfolioRoutes from './routes/portfolio.routes';
import servicesRoutes from './routes/services.routes';
import testimonialsRoutes from './routes/testimonials.routes';
import seoRoutes from './routes/seo.routes';
import mediaRoutes from './routes/media.routes';
import leadsRoutes from './routes/leads.routes';
import themeRoutes from './routes/theme.routes';
import homeSectionsRoutes from './routes/home-sections.routes';
import caseStudiesRoutes from './routes/case-studies.routes';
import analyticsRoutes from './routes/analytics.routes';
import contentRoutes from './routes/content.routes';
import publicRoutes from './routes/public.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/sitemap.xml', async (_req, res, next) => {
    try {
      const { buildSitemapXml, generateSitemapUrls } = await import('./services/seo.service');
      const urls = await generateSitemapUrls();
      res.type('application/xml').send(buildSitemapXml(urls));
    } catch (err) {
      next(err);
    }
  });

  app.get('/robots.txt', async (_req, res, next) => {
    try {
      const { generateRobotsTxt } = await import('./services/seo.service');
      res.type('text/plain').send(await generateRobotsTxt());
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/blog', blogRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/testimonials', testimonialsRoutes);
  app.use('/api/seo', seoRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/theme', themeRoutes);
  app.use('/api/home-sections', homeSectionsRoutes);
  app.use('/api/case-studies', caseStudiesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/public', publicRoutes);

  app.use(errorHandler);

  return app;
}
