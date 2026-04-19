'use client';

import { useEffect, useState } from 'react';
import { billingApi, type BillingResponse, type BillingPlan } from '@/lib/api/billing';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/PermissionGate';
import toast from 'react-hot-toast';

export default function BillingSettingsPage() {
  const { role, isOwner } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingResponse | null>(null);

  const loadBilling = async () => {
    try {
      setLoading(true);
      const data = await billingApi.getWorkspaceBilling();
      setBilling(data);
    } catch (error: any) {
      console.error('Failed to load billing', error);
      toast.error(error.response?.data?.message || 'Failed to load billing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBilling();
  }, []);

  const handleUpgrade = async (targetPlan: BillingPlan['plan']) => {
    if (!isOwner) {
      toast.error('Only workspace owner can upgrade plans');
      return;
    }

    try {
      setUpgradingPlan(targetPlan);
      const result = await billingApi.upgradePlan(targetPlan, 'monthly');
      toast.success(result.message || 'Plan upgraded successfully');
      await loadBilling();
    } catch (error: any) {
      console.error('Failed to upgrade plan', error);
      toast.error(error.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setUpgradingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded bg-slate-200 animate-pulse" />
        <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-56 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <PermissionGate
      permission={Permissions.WORKSPACE_BILLING}
      fallback={
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-lg font-semibold text-amber-900">Billing Access Restricted</h1>
          <p className="mt-2 text-sm text-amber-800">
            Your role ({role}) does not have billing permissions. Contact workspace owner to manage plans.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Plans</h1>
          <p className="mt-1 text-sm text-slate-600">Manage workspace plan, template quota, and messaging cost assumptions.</p>
        </div>

        {billing?.workspace && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Current Workspace Plan</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Current Plan" value={billing.workspace.plan.toUpperCase()} />
              <Metric label="Subscription" value={billing.workspace.subscriptionStatus} />
              <Metric
                label="Template Usage"
                value={`${billing.workspace.templateMessagesUsed}/${billing.workspace.templateMessagesLimit < 0 ? '∞' : billing.workspace.templateMessagesLimit}`}
              />
              <Metric
                label="Quota Reset"
                value={new Date(billing.workspace.quotaResetAt).toLocaleDateString()}
              />
            </div>
          </section>
        )}

        {billing?.costs && (
          <section className="rounded-xl border border-primary-200 bg-primary-50 p-5">
            <h2 className="text-lg font-semibold text-primary-900">Current Cost Configuration</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-primary-900">
              <CostChip label="Utility" value={`PKR ${billing.costs.UTILITY_TEMPLATE}`} />
              <CostChip label="Marketing" value={`PKR ${billing.costs.MARKETING_TEMPLATE}`} />
              <CostChip label="Session" value={`PKR ${billing.costs.SESSION_MESSAGE}`} />
              <CostChip label="Average" value={`PKR ${billing.costs.AVERAGE_TEMPLATE_COST}`} />
            </div>
            {billing.disclaimer && <p className="mt-3 text-xs text-primary-800">{billing.disclaimer}</p>}
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Available Plans</h2>
            {!isOwner && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Owner action required for upgrades
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {billing?.plans
              ?.filter((plan) => plan.plan !== 'free')
              .map((plan) => {
                const isCurrent = billing.currentPlan === plan.plan;
                const busy = upgradingPlan === plan.plan;
                return (
                  <article key={plan.plan} className={`rounded-xl border p-4 ${isCurrent ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white'}`}>
                    <h3 className="text-lg font-semibold text-slate-900">{plan.displayName}</h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900">PKR {plan.monthlyPrice.toLocaleString()}<span className="ml-1 text-sm font-medium text-slate-600">/month</span></p>
                    <ul className="mt-3 space-y-1 text-sm text-slate-700">
                      <li>Template quota: {plan.templateMessagesLimit < 0 ? 'Unlimited' : plan.templateMessagesLimit}</li>
                      <li>Max contacts: {plan.maxContacts < 0 ? 'Unlimited' : plan.maxContacts.toLocaleString()}</li>
                      <li>Max members: {plan.maxMembers < 0 ? 'Unlimited' : plan.maxMembers.toLocaleString()}</li>
                    </ul>
                    <button
                      onClick={() => void handleUpgrade(plan.plan)}
                      disabled={isCurrent || busy || !isOwner}
                      className="mt-4 w-full rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCurrent ? 'Current Plan' : busy ? 'Upgrading...' : `Upgrade to ${plan.displayName}`}
                    </button>
                  </article>
                );
              })}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CostChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-primary-200 bg-white px-3 py-2">
      <p className="text-xs text-primary-700">{label}</p>
      <p className="text-sm font-semibold text-primary-900">{value}</p>
    </div>
  );
}
