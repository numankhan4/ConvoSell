import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  SubscriptionPlan,
  SUBSCRIPTION_PLANS,
  resolveWhatsappCosts,
  type PlanFeatures,
} from '../common/constants/subscription.constants';
import { BillingCycle } from './dto/upgrade-plan.dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  getPlans(workspacePlan?: string) {
    const costs = resolveWhatsappCosts();
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => this.mapPlan(plan, costs));

    return {
      currentPlan: workspacePlan || SubscriptionPlan.FREE,
      costs,
      plans,
      disclaimer:
        'Messaging costs are configurable and may change by Meta region/category. Review pricing regularly.',
    };
  }

  async getWorkspaceBilling(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        templateMessagesUsed: true,
        templateMessagesLimit: true,
        quotaResetAt: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      workspace,
      ...this.getPlans(workspace.plan),
    };
  }

  async upgradePlan(workspaceId: string, targetPlan: SubscriptionPlan, billingCycle: BillingCycle) {
    const features = SUBSCRIPTION_PLANS[targetPlan];
    if (!features) {
      throw new BadRequestException('Invalid plan selected');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        plan: true,
        templateMessagesUsed: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.plan === targetPlan) {
      throw new BadRequestException('Workspace is already on this plan');
    }

    const quotaResetAt = new Date();
    quotaResetAt.setMonth(quotaResetAt.getMonth() + 1, 1);
    quotaResetAt.setHours(0, 0, 0, 0);

    const limit = features.templateMessagesLimit;
    const nextUsed = limit >= 0 ? Math.min(workspace.templateMessagesUsed, limit) : workspace.templateMessagesUsed;

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: targetPlan,
        maxMembers: features.maxMembers < 0 ? 1000000 : features.maxMembers,
        maxContacts: features.maxContacts < 0 ? 1000000 : features.maxContacts,
        templateMessagesLimit: limit,
        templateMessagesUsed: nextUsed,
        quotaResetAt,
        subscriptionStatus: 'active',
      },
      select: {
        id: true,
        name: true,
        plan: true,
        templateMessagesLimit: true,
        templateMessagesUsed: true,
        quotaResetAt: true,
        subscriptionStatus: true,
      },
    });

    return {
      message: `Workspace upgraded to ${features.displayName} (${billingCycle})`,
      workspace: updated,
      selectedPlan: this.mapPlan(features, resolveWhatsappCosts()),
    };
  }

  private mapPlan(plan: PlanFeatures, costs: ReturnType<typeof resolveWhatsappCosts>) {
    return {
      ...plan,
      monthlyTemplateCostEstimate:
        plan.templateMessagesLimit > 0 ? plan.templateMessagesLimit * costs.UTILITY_TEMPLATE : 0,
    };
  }
}
