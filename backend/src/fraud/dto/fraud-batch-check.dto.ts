import { IsArray, IsBoolean, IsOptional, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class FraudBatchCheckDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  orderIds: string[];

  @IsOptional()
  @IsBoolean()
  forceRecompute?: boolean;

  @IsOptional()
  @IsBoolean()
  includeGeo?: boolean;
}
