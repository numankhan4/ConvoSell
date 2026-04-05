import { IsString, IsOptional, IsArray, IsEnum, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum HeaderType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export class TemplateVariableDto {
  @IsString()
  name: string;

  @IsString()
  example: string;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  @IsOptional()
  language?: string; // Default: 'en'

  @IsEnum(HeaderType)
  @IsOptional()
  headerType?: HeaderType;

  @IsString()
  @IsOptional()
  headerText?: string;

  @IsString()
  @IsOptional()
  headerMediaUrl?: string;

  @IsString()
  bodyText: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @IsArray()
  @IsOptional()
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  bodyText?: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsArray()
  @IsOptional()
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export class SendTemplateDto {
  @IsString()
  recipientPhone: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsArray()
  @IsOptional()
  headerParams?: string[];

  @IsArray()
  @ArrayMinSize(0)
  bodyParams: string[];

  @IsArray()
  @IsOptional()
  buttonParams?: string[];
}
