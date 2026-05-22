import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import { authRoutes } from './modules/auth/auth.routes';
import { adminSourcesRoutes } from './modules/sources/sources.routes';
import { adminJobsRoutes } from './modules/jobs/admin-jobs.routes';
import { publicJobsRoutes } from './modules/jobs/public-jobs.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { errorHandler } from './middleware/error';
import { sendResponse } from './utils/response';
import logger from './utils/logger';

const app: Application = express();

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// HTTP request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Swagger API Docs
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Job Aggregator API Docs',
  }));
} catch {
  logger.warn('OpenAPI spec not found. Swagger UI disabled.');
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  sendResponse({ res, message: 'Server is running', data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminSourcesRoutes);
app.use('/api/v1/admin', adminJobsRoutes);
app.use('/api/v1/jobs', publicJobsRoutes);
app.use('/api/v1/admin', analyticsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  sendResponse({ res, statusCode: 404, success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
