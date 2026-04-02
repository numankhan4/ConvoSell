import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if webhook event was already processed (idempotency)
   */
  async isProcessed(source: string, externalId: string): Promise<boolean> {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { externalId },
    });

    return !!existing;
  }

  /**
   * Mark webhook event as processed
   */
  async markProcessed(
    source: string,
    externalId: string,
    eventType: string,
    payload: any,
  ): Promise<void> {
    await this.prisma.webhookEvent.create({
      data: {
        source,
        externalId,
        eventType,
        payload,
      },
    });

    this.logger.log(`Webhook processed: ${source}/${eventType}/${externalId}`);
  }
}
