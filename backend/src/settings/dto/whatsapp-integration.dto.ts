import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches, IsEnum, IsDateString } from 'class-validator';

export class CreateWhatsAppIntegrationDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +923001234567)',
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  businessAccountId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional() // Made optional since it's not required (uses env variable)
  webhookVerifyToken?: string;

  @IsEnum(['temporary', 'long-lived', 'system-user'])
  @IsOptional()
  tokenType?: string;

  @IsDateString()
  @IsOptional()
  tokenExpiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWhatsAppIntegrationDto {
  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +923001234567)',
  })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  businessAccountId?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  webhookVerifyToken?: string;

  @IsEnum(['temporary', 'long-lived', 'system-user'])
  @IsOptional()
  tokenType?: string;

  @IsDateString()
  @IsOptional()
  tokenExpiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
