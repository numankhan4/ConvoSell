import { IsEnum, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../../common/constants/subscription.constants';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class UpgradePlanDto {
  @IsEnum(SubscriptionPlan)
  targetPlan: SubscriptionPlan;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;
}
