import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';

/**
 * Shopify 2026: Use Client Credentials (OAuth 2.0 Client Credentials Grant)
 * Docs: https://shopify.dev/docs/apps/build/authentication-authorization/client-secrets
 */
export class CreateShopifyStoreDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/, {
    message: 'Shop domain must be a valid Shopify domain (e.g., mystore.myshopify.com)',
  })
  shopDomain: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsString()
  @IsNotEmpty()
  scopes: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateShopifyStoreDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/, {
    message: 'Shop domain must be a valid Shopify domain (e.g., mystore.myshopify.com)',
  })
  shopDomain?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  scopes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
