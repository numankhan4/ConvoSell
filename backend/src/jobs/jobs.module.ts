import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'outbox',
    }),
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
