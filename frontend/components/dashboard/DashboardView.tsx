import Link from 'next/link';
import { PermissionGate } from '@/components/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { formatMoney } from '@/lib/currency';
import type { ActivityStatus, DashboardModel, DashboardRange, Priority, SetupStatus } from './dashboard-model';

export function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-40 rounded-3xl bg-neutral-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="h-32 rounded-2xl bg-neutral-200" />
        <div className="h-32 rounded-2xl bg-neutral-200" />
        <div className="h-32 rounded-2xl bg-neutral-200" />
        <div className="h-32 rounded-2xl bg-neutral-200" />
      </div>
      <div className="h-72 rounded-2xl bg-neutral-200" />
    </div>
  );
}

export function DashboardView({
  role,
  dashboard,
  selectedRange,
  onRangeChange,
  onRefresh,
  isRefreshing,
  lastUpdatedLabel,
}: {
  role: string;
  dashboard: DashboardModel;
  selectedRange: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdatedLabel: string;
}) {
  const confirmationRate = topMetricsValue(topMetricsLookup(dashboard.smartMetrics, 'confirmation-rate'));
  const responseRate = topMetricsValue(topMetricsLookup(dashboard.smartMetrics, 'response-rate'));
  const fraudRate = topMetricsValue(topMetricsLookup(dashboard.smartMetrics, 'fraud-detection-rate'));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_46%),linear-gradient(120deg,_#312E81_0%,_#4338CA_52%,_#4F46E5_100%)] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary-200">ConvoSell Revenue Recovery Console</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">Protect COD revenue with confident decisions.</h1>
              <p className="mt-2 max-w-3xl text-sm sm:text-base text-primary-100/95">
                Prioritize risky orders, recover pending value, and keep verification operations reliable.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${roleStyle(role)}`}>Role: {role}</span>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
                Currency: {dashboard.currency}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {dashboard.filters.availableRanges.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => onRangeChange(range)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                      selectedRange === range
                        ? 'bg-white text-neutral-900'
                        : 'border border-white/20 bg-transparent text-primary-100 hover:bg-white/10'
                    }`}
                  >
                    {range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                  </button>
                ))}
                <span className="ml-1 text-xs text-primary-100/80">Range: {rangeLabel(selectedRange)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-primary-100">{lastUpdatedLabel}</span>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-success-200 bg-success-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-success-700">Revenue Protected</p>
          <p className="mt-2 text-2xl font-bold text-success-900">
            {formatMoney(dashboard.outcomes.protectedRevenue, dashboard.currency)}
          </p>
          <p className="mt-1 text-xs text-success-800">Estimated value saved by verification and recovery actions.</p>
        </article>

        <article className="rounded-2xl border border-danger-200 bg-danger-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-danger-700">Revenue At Risk</p>
          <p className="mt-2 text-2xl font-bold text-danger-900">
            {formatMoney(dashboard.outcomes.revenueAtRisk, dashboard.currency)}
          </p>
          <p className="mt-1 text-xs text-danger-800">Potential loss tied to pending and high-risk orders.</p>
        </article>

        <article className="rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-primary-700">Recovery Efficiency</p>
          <p className="mt-2 text-2xl font-bold text-primary-900">{dashboard.outcomes.recoveryEfficiency}%</p>
          <p className="mt-1 text-xs text-primary-800">Recovered value as a share of expected revenue.</p>
        </article>
      </section>

      {dashboard.mode === 'empty' && (
        <section className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
          <h2 className="text-sm font-semibold text-primary-900">No synced order history yet</h2>
          <p className="mt-1 text-sm text-primary-800">
            Your dashboard will become fully data-driven as soon as order sync and verification events start flowing.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/dashboard/settings" className="inline-flex items-center rounded-lg bg-primary-700 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-800">
              Complete Setup
            </Link>
            <Link href="/dashboard/automations" className="inline-flex items-center rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-100">
              Activate Automation
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue Saved"
          value={formatMoney(dashboard.kpis.revenueSaved.value, dashboard.currency)}
          change={dashboard.kpis.revenueSaved.change}
          description={dashboard.kpis.revenueSaved.description}
          trendPoints={dashboard.kpis.revenueSaved.trendPoints}
          tone="success"
          featured
        />
        <KpiCard
          label="High Risk Orders"
          value={dashboard.kpis.highRiskOrders.value.toLocaleString()}
          change={dashboard.kpis.highRiskOrders.change}
          description={dashboard.kpis.highRiskOrders.description}
          trendPoints={dashboard.kpis.highRiskOrders.trendPoints}
          tone="risk"
        />
        <KpiCard
          label="Confirmed Orders"
          value={dashboard.kpis.confirmedOrders.value.toLocaleString()}
          change={dashboard.kpis.confirmedOrders.change}
          description={dashboard.kpis.confirmedOrders.description}
          trendPoints={dashboard.kpis.confirmedOrders.trendPoints}
          tone="success"
        />
        <KpiCard
          label="Pending Verification"
          value={dashboard.kpis.pendingVerification.value.toLocaleString()}
          change={dashboard.kpis.pendingVerification.change}
          description={dashboard.kpis.pendingVerification.description}
          trendPoints={dashboard.kpis.pendingVerification.trendPoints}
          tone="pending"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-7 gap-4">
        <article className="xl:col-span-4 rounded-2xl border border-danger-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Action Center</h2>
              <p className="text-sm text-neutral-600">Impact-ranked tasks to protect revenue right now.</p>
            </div>
            <span className="rounded-full bg-danger-100 px-3 py-1 text-xs font-semibold text-danger-700">Live Queue</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {dashboard.actionCenter.map((item) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                    <PriorityPill priority={item.priority} />
                    <p className="text-sm sm:text-base text-neutral-900 font-medium">{item.text}</p>
                  </div>
                  <p className="text-xs text-neutral-600">
                    {item.impactLabel}: <span className="font-semibold text-neutral-900">{formatMoney(item.impactValue, dashboard.currency)}</span>
                  </p>
                  </div>
                  <Link href={item.href} className="inline-flex h-9 items-center justify-center rounded-lg bg-accent-600 px-3.5 text-sm font-semibold text-white hover:bg-accent-700 sm:justify-self-end">
                    {item.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="xl:col-span-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">System Health</h2>
          <p className="text-sm text-neutral-600">Quick view of verification performance and setup readiness.</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <HealthMetric label="Confirmation" value={confirmationRate} tone="success" />
            <HealthMetric label="Response" value={responseRate} tone="primary" />
            <HealthMetric label="Fraud Catch" value={fraudRate} tone="danger" />
          </div>

          <div className="mt-4 h-2.5 w-full rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${dashboard.activation.progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-500">Setup completion: {dashboard.activation.progress}%</p>

          <div className="mt-4 space-y-2.5">
            {dashboard.activation.steps.map((step) => (
              <div key={step.id} className="rounded-xl border border-neutral-200 p-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${setupDot(step.status)}`} />
                  <span className="text-sm font-medium text-neutral-900">{step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${setupBadge(step.status)}`}>{setupText(step.status)}</span>
                  <Link href={step.href} className="text-sm font-semibold text-primary-800 hover:text-primary-900">
                    {step.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-7 gap-4">
        <PermissionGate
          permission={Permissions.ANALYTICS_VIEW_REVENUE}
          fallback={
            <article className="xl:col-span-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Revenue Breakdown</h2>
              <p className="mt-2 text-sm text-neutral-600">Revenue visibility requires analytics permission.</p>
            </article>
          }
        >
          <article className="xl:col-span-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Revenue Breakdown</h2>
            <p className="text-sm text-neutral-600">How value is distributed across protected, expected, and pending orders.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RevenueBlock
                label="Revenue Saved"
                value={formatMoney(dashboard.revenueBreakdown.saved, dashboard.currency)}
                hint="Estimated protected value from verification"
                tone="success"
              />
              <RevenueBlock
                label="Expected Revenue"
                value={formatMoney(dashboard.revenueBreakdown.expected, dashboard.currency)}
                hint="Confirmed and completed order value"
                tone="default"
              />
              <RevenueBlock
                label="Pending Verification Value"
                value={formatMoney(dashboard.revenueBreakdown.pending, dashboard.currency)}
                hint="Value currently blocked in pending responses"
                tone="pending"
              />
            </div>
          </article>
        </PermissionGate>

        <article className="xl:col-span-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Live Activity Feed</h2>
          <p className="text-sm text-neutral-600">Snapshot of verification outcomes and messaging reliability.</p>
          <ul className="mt-4 space-y-3">
            {dashboard.activityFeed.map((event) => (
              <li key={event.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${activityDot(event.status)}`} />
                    <p className="text-sm text-neutral-900">{event.message}</p>
                  </div>
                  <span className="text-xs text-neutral-500">{event.timestamp}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Insights</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {dashboard.insights.map((insight, index) => (
            <li key={`${insight}-${index}`} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-sm text-neutral-800">
              {insight}
            </li>
          ))}
        </ul>
      </section>

      {dashboard.notices.length > 0 && (
        <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <ul className="space-y-2 text-sm text-neutral-600">
            {dashboard.notices.map((notice, index) => (
              <li key={`${notice}-${index}`} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-700" />
                <span>{notice}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function rangeLabel(range: DashboardRange) {
  if (range === 'today') return 'Today';
  if (range === '7d') return 'Last 7 days';
  return 'Last 30 days';
}

function topMetricsLookup(metrics: DashboardModel['smartMetrics'], id: string) {
  return metrics.find((metric) => metric.id === id)?.value || '0%';
}

function topMetricsValue(value: string) {
  return value || '0%';
}

function HealthMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'primary' | 'danger';
}) {
  const styles = {
    success: 'border-success-200 bg-success-50 text-success-800',
    primary: 'border-primary-200 bg-primary-50 text-primary-800',
    danger: 'border-danger-200 bg-danger-50 text-danger-800',
  };

  return (
    <div className={`rounded-xl border p-2.5 ${styles[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  description,
  trendPoints,
  tone,
  featured,
}: {
  label: string;
  value: string;
  change: string;
  description: string;
  trendPoints: number[];
  tone: 'success' | 'risk' | 'pending';
  featured?: boolean;
}) {
  const toneStyle = {
    success: 'border-success-200 bg-success-50',
    risk: 'border-danger-200 bg-danger-50',
    pending: 'border-accent-200 bg-accent-50',
  };

  const sparklineStroke = featured
    ? 'stroke-primary-200'
    : tone === 'risk'
      ? 'stroke-danger-500'
      : tone === 'pending'
        ? 'stroke-accent-500'
        : 'stroke-success-500';

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        featured
          ? 'border-primary-800 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_44%),linear-gradient(125deg,_#312E81_0%,_#4338CA_55%,_#4F46E5_100%)] text-white'
          : toneStyle[tone]
      }`}
    >
      <p className={`text-sm font-medium ${featured ? 'text-primary-200' : 'text-neutral-600'}`}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${featured ? 'text-white' : 'text-neutral-900'}`}>{value}</p>
      <p className={`mt-1 text-sm ${featured ? 'text-primary-100' : 'text-neutral-700'}`}>{change}</p>
      <div className={`mt-3 rounded-lg ${featured ? 'bg-white/12 ring-1 ring-white/15' : 'bg-white/60'} p-2`}>
        <Sparkline points={trendPoints} strokeClass={sparklineStroke} />
      </div>
      <p className={`mt-2 text-xs ${featured ? 'text-primary-100' : 'text-neutral-600'}`}>{description}</p>
    </article>
  );
}

function Sparkline({ points, strokeClass }: { points: number[]; strokeClass: string }) {
  const width = 120;
  const height = 32;
  const padding = 2;
  const safePoints = points.length >= 2 ? points : [0.5, 0.5];
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const range = Math.max(max - min, 0.0001);

  const plot = safePoints.map((point, index) => {
    const x = padding + (index / (safePoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" role="img" aria-label="KPI trend sparkline">
      <polyline
        points={plot.join(' ')}
        fill="none"
        className={strokeClass}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RevenueBlock({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'success' | 'pending' | 'default';
}) {
  const toneClass = {
    success: 'border-success-200 bg-success-50',
    pending: 'border-accent-200 bg-accent-50',
    default: 'border-neutral-200 bg-neutral-50',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClass[tone]}`}>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-600">{hint}</p>
    </div>
  );
}

function PriorityPill({ priority }: { priority: Priority }) {
  const style = {
    critical: 'bg-danger-100 text-danger-700 border-danger-200',
    high: 'bg-accent-100 text-accent-800 border-accent-200',
    medium: 'bg-primary-100 text-primary-800 border-primary-200',
    info: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style[priority]}`}>{priority}</span>;
}

function activityDot(status: ActivityStatus) {
  if (status === 'success') return 'bg-success-500';
  if (status === 'risk') return 'bg-danger-500';
  if (status === 'failed') return 'bg-danger-600';
  if (status === 'pending') return 'bg-accent-500';
  return 'bg-neutral-400';
}

function setupDot(status: SetupStatus) {
  if (status === 'done') return 'bg-success-500';
  if (status === 'in_progress') return 'bg-accent-500';
  return 'bg-neutral-400';
}

function setupText(status: SetupStatus) {
  if (status === 'done') return 'Complete';
  if (status === 'in_progress') return 'In Progress';
  return 'Not Started';
}

function setupBadge(status: SetupStatus) {
  if (status === 'done') return 'bg-success-100 text-success-700';
  if (status === 'in_progress') return 'bg-accent-100 text-accent-800';
  return 'bg-neutral-100 text-neutral-700';
}

function roleStyle(role: string) {
  if (role === 'owner') return 'bg-primary-100 text-primary-800 border-primary-200';
  if (role === 'admin') return 'bg-primary-50 text-primary-700 border-primary-200';
  if (role === 'manager') return 'bg-success-100 text-success-800 border-success-200';
  if (role === 'agent') return 'bg-accent-100 text-accent-800 border-accent-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
}
