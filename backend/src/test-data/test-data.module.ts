import { Module } from '@nestjs/common';
import { TestDataController } from './test-data.controller';
import { TestDataService } from './test-data.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestDataController],
  providers: [TestDataService],
  exports: [TestDataService],
})
export class TestDataModule {}
