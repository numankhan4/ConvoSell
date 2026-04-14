import { IsArray, ArrayMaxSize, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class FraudLexiconSettingsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  suspiciousKeywords?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  disposableDomains?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  fuzzyMatchDistance?: number;
}
