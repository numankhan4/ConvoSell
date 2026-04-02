import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { processOrderEvent } from './processors/order-processor';
import { processSendMessage } from './processors/message-processor';
import { healthCheckProcessor } from './processors/health-check-processor';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
};

/**
 * Outbox queue worker
 * Processes order-related events and triggers automations
 */
const outboxWorker = new Worker(
  'outbox',
  async (job: Job) => {
    console.log(`Processing outbox job: ${job.name} (${job.id})`);

    try {
      if (job.name === 'process-order-event') {
        await processOrderEvent(job.data, prisma);
      }

      // Mark outbox event as completed
      if (job.data.eventId) {
        await prisma.outboxEvent.update({
          where: { id: job.data.eventId },
          data: {
            status: 'completed',
            processedAt: new Date(),
          },
        });
      }

      console.log(`✅ Completed: ${job.name}`);
    } catch (error) {
      console.error(`❌ Failed: ${job.name}`, error);

      // Mark as failed
      if (job.data.eventId) {
        await prisma.outboxEvent.update({
          where: { id: job.data.eventId },
          data: {
            status: 'failed',
            lastError: error instanceof Error ? error.message : String(error),
          },
        });
      }

      throw error; // Rethrow for BullMQ retry logic
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

/**
 * WhatsApp queue worker
 * Handles sending WhatsApp messages
 */
const whatsappWorker = new Worker(
  'whatsapp',
  async (job: Job) => {
    console.log(`Processing WhatsApp job: ${job.name} (${job.id})`);

    try {
      if (job.name === 'send-message') {
        await processSendMessage(job.data, prisma);
      }

      // Mark outbox event as completed
      if (job.data.eventId) {
        await prisma.outboxEvent.update({
          where: { id: job.data.eventId },
          data: {
            status: 'completed',
            processedAt: new Date(),
          },
        });
      }

      console.log(`✅ Completed: ${job.name}`);
    } catch (error) {
      console.error(`❌ Failed: ${job.name}`, error);

      if (job.data.eventId) {
        await prisma.outboxEvent.update({
          where: { id: job.data.eventId },
          data: {
            status: 'failed',
            lastError: error instanceof Error ? error.message : String(error),
          },
        });
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  },
);

// Event listeners
outboxWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

outboxWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

whatsappWorker.on('completed', (job) => {
  console.log(`WhatsApp job ${job.id} completed`);
});

whatsappWorker.on('failed', (job, err) => {
  console.error(`WhatsApp job ${job?.id} failed:`, err);
});

// Run health checks every hour
const healthCheckInterval = setInterval(async () => {
  try {
    await healthCheckProcessor(prisma);
  } catch (error) {
    console.error('Health check failed:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Run initial health check after 30 seconds
setTimeout(async () => {
  try {
    console.log('Running initial health check...');
    await healthCheckProcessor(prisma);
  } catch (error) {
    console.error('Initial health check failed:', error);
  }
}, 30 * 1000);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  clearInterval(healthCheckInterval);
  await outboxWorker.close();
  await whatsappWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('🚀 Worker started');
console.log('📦 Listening to queues: outbox, whatsapp');
console.log('🏥 Health checks will run every hour');
