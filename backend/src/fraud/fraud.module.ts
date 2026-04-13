import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';

@Module({
  imports: [HttpModule],
  providers: [FraudService],
  controllers: [FraudController],
  exports: [FraudService],
})
export class FraudModule {}
