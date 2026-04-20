import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppTokenService } from './whatsapp-token.service';

/**
 * Cron service for WhatsApp token management
 * Runs daily to check and refresh expiring tokens
 */
@Injectable()
export class WhatsAppCronService {
  private readonly logger = new Logger(WhatsAppCronService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private whatsappTokenService: WhatsAppTokenService) {}

  /**
   * Start the daily token refresh check
   * Runs every 24 hours
   */
  startDailyRefresh() {
    if (this.intervalId) {
      this.logger.warn('Daily refresh is already running');
      return;
    }

    this.logger.log('Starting daily token refresh scheduler');

    // Run immediately on startup
    this.runRefreshCheck();

    // Then run every 24 hours
    this.intervalId = setInterval(
      () => this.runRefreshCheck(),
      24 * 60 * 60 * 1000, // 24 hours
    );

    this.logger.log('Daily token refresh scheduler started');
  }

  /**
   * Stop the scheduled refresh
   */
  stopDailyRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Daily token refresh scheduler stopped');
    }
  }

  /**
   * Run the token refresh check manually
   */
  private async runRefreshCheck() {
    try {
      this.logger.log('Running scheduled token refresh check');
      
      const results = await this.whatsappTokenService.autoRefreshExpiringTokens();
      const qualityResults = await this.whatsappTokenService.checkPhoneQualityAlerts();
      
      this.logger.log(
        `Token refresh check complete: ${results.refreshed} refreshed, ${results.failed} failed`,
      );
      this.logger.log(
        `Phone quality check complete: ${qualityResults.checked} checked, ${qualityResults.alerts} alerts`,
      );

      // Log failures for monitoring
      if (results.failed > 0) {
        this.logger.warn(
          `Failed to refresh ${results.failed} tokens. Check logs for details.`,
        );
      }

      if (qualityResults.alerts > 0) {
        this.logger.warn(
          `Detected ${qualityResults.alerts} WhatsApp phone quality alerts. Review integration health.`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Scheduled token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get refresh status
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      intervalHours: 24,
    };
  }
}
