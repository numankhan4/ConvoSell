import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('outbox') private outboxQueue: Queue,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    private prisma: PrismaService,
  ) {
    // Poll outbox events every 5 seconds
    this.startOutboxProcessor();
  }

  /**
   * Start polling outbox events
   */
  private startOutboxProcessor() {
    setInterval(async () => {
      await this.processOutboxEvents();
    }, 5000);
  }

  /**
   * Process pending outbox events
   */
  async processOutboxEvents() {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'pending',
        attempts: { lt: 3 },
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of events) {
      try {
        // Mark as processing
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'processing',
            attempts: { increment: 1 },
          },
        });

        // Enqueue job based on event type
        if (event.eventType.startsWith('order.')) {
          await this.outboxQueue.add('process-order-event', {
            eventId: event.id,
            eventType: event.eventType,
            payload: event.payload,
          });
        } else if (event.eventType.startsWith('message.')) {
          await this.whatsappQueue.add('send-message', {
            eventId: event.id,
            payload: event.payload,
          });
        }

        this.logger.log(`Enqueued outbox event: ${event.eventType} (${event.id})`);
      } catch (error) {
        this.logger.error(`Failed to process outbox event ${event.id}`, error);

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'pending',
            lastError: error.message,
          },
        });
      }
    }
  }

  /**
   * Mark outbox event as completed
   */
  async markOutboxCompleted(eventId: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'completed',
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark outbox event as failed
   */
  async markOutboxFailed(eventId: string, error: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        lastError: error,
      },
    });
  }
}
