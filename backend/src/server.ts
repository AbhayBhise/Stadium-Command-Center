import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const port = env.PORT;

    const server = app.listen(port, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${String(port)}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

    // Graceful shutdown — disconnect Prisma before exit
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        void disconnectDatabase().then(() => {
          logger.info('Process terminated.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => {
      shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      shutdown('SIGINT');
    });
  } catch (error) {
    logger.error(`Failed to start server: ${String(error)}`);
    process.exit(1);
  }
};

void startServer();
