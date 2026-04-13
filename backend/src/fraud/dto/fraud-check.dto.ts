import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FraudCheckDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsBoolean()
  forceRecompute?: boolean;

  @IsOptional()
  @IsBoolean()
  includeGeo?: boolean;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
