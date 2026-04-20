import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthCheckModule } from './common/health/health-check.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ShopifyOAuthModule } from './shopify/oauth/shopify-oauth.module';
import { CrmModule } from './crm/crm.module';
import { OrdersModule } from './orders/orders.module';
import { AutomationsModule } from './automations/automations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { JobsModule } from './jobs/jobs.module';
import { SettingsModule } from './settings/settings.module';
import { TemplatesModule } from './templates/templates.module';
import { TestDataModule } from './test-data/test-data.module';
import { FraudModule } from './fraud/fraud.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // BullMQ (job queue)
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
          port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
        },
      }),
    }),

    // Core infrastructure
    PrismaModule,
    CommonModule,
    HealthCheckModule,

    // Feature modules
    AuthModule,
    TenantModule,
    WhatsAppModule,
    ShopifyModule,
    ShopifyOAuthModule,
    CrmModule,
    OrdersModule,
    AutomationsModule,
    WebhooksModule,
    JobsModule,
    SettingsModule,
    TemplatesModule,
    TestDataModule,
    FraudModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
