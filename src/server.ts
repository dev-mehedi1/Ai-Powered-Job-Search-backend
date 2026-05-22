import 'dotenv/config';
import http from 'http';
import app from './app';
import { config } from './config';
import logger from './utils/logger';
import prisma from './database/client';
import { initializeCronJobs } from './modules/crawler/cron.service';

const server = http.createServer(app);

async function startServer(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Initialize background cron jobs
    initializeCronJobs();
    logger.info('✅ Cron jobs initialized');

    server.listen(config.port, () => {
      logger.info(`🚀 Server is running on http://localhost:${config.port}`);
      logger.info(`📚 API Docs available at http://localhost:${config.port}/api-docs`);
      logger.info(`🔍 Health check at http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
