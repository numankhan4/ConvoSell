import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';

@Module({
  imports: [HttpModule],
  providers: [ShopifyService],
  controllers: [ShopifyController],
  exports: [ShopifyService],
})
export class ShopifyModule {}
