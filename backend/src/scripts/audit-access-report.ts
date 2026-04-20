import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Options = {
  days: number;
  workspaceId?: string;
  userId?: string;
  actions: string[];
  limit: number;
  json: boolean;
  help: boolean;
};

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;
const DEFAULT_ACTIONS = [
  'contacts.list.view',
  'contact.detail.view',
  'conversations.list.view',
  'conversation.detail.view',
  'contacts.export',
  'order.detail.view',
  'orders.export',
];

function parseIntOrDefault(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);
  const options: Options = {
    days: DEFAULT_DAYS,
    actions: [...DEFAULT_ACTIONS],
    limit: DEFAULT_LIMIT,
    json: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (!arg.startsWith('--')) continue;

    const [rawKey, rawValue] = arg.split('=');
    const key = rawKey.replace(/^--/, '');
    const value = rawValue || '';

    if (key === 'days') {
      options.days = parseIntOrDefault(value, DEFAULT_DAYS);
    } else if (key === 'workspaceId' && value) {
      options.workspaceId = value;
    } else if (key === 'userId' && value) {
      options.userId = value;
    } else if (key === 'actions' && value) {
      options.actions = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (key === 'limit') {
      options.limit = parseIntOrDefault(value, DEFAULT_LIMIT);
    }
  }

  return options;
}

function printHelp() {
  console.log('Audit Access Report (Ticket 4 evidence)');
  console.log('');
  console.log('Usage:');
  console.log('  npm run security:audit-report -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --days=30                  Lookback window in days (default 30)');
  console.log('  --workspaceId=<id>         Filter by workspace');
  console.log('  --userId=<id>              Filter by actor user id');
  console.log('  --actions=a,b,c            Comma-separated action list');
  console.log('  --limit=200                Max raw events returned (default 200)');
  console.log('  --json                     Print machine-readable JSON output');
  console.log('  --help                     Show this help message');
}

async function run() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);

  const where: any = {
    createdAt: { gte: since },
    action: { in: options.actions },
  };

  if (options.workspaceId) {
    where.workspaceId = options.workspaceId;
  }

  if (options.userId) {
    where.userId = options.userId;
  }

  const [events, actionSummary, workspaceSummary] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
    }),
    prisma.auditLog.groupBy({
      by: ['workspaceId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { workspaceId: 'desc' } },
      take: 20,
    }),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    filters: {
      since: since.toISOString(),
      days: options.days,
      workspaceId: options.workspaceId || null,
      userId: options.userId || null,
      actions: options.actions,
      limit: options.limit,
    },
    totals: {
      returnedEvents: events.length,
      actionGroups: actionSummary.length,
      workspaceGroups: workspaceSummary.length,
    },
    actionSummary: actionSummary.map((row) => ({
      action: row.action,
      count: row._count._all,
    })),
    workspaceSummary: workspaceSummary.map((row) => ({
      workspaceId: row.workspaceId,
      count: row._count._all,
    })),
    recentEvents: events,
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Audit Access Report (Ticket 4 evidence)');
  console.log('='.repeat(60));
  console.log(`Generated: ${payload.generatedAt}`);
  console.log(`Window start: ${payload.filters.since}`);
  console.log(`Filters: workspace=${payload.filters.workspaceId || 'all'}, user=${payload.filters.userId || 'all'}`);
  console.log(`Actions: ${payload.filters.actions.join(', ')}`);
  console.log('');

  console.log('Action Summary:');
  for (const row of payload.actionSummary) {
    console.log(`  - ${row.action}: ${row.count}`);
  }

  console.log('');
  console.log('Workspace Summary (top 20):');
  for (const row of payload.workspaceSummary) {
    console.log(`  - ${row.workspaceId}: ${row.count}`);
  }

  console.log('');
  console.log(`Recent Events Returned: ${payload.totals.returnedEvents}`);
  for (const event of payload.recentEvents.slice(0, 20)) {
    console.log(
      `  - ${event.createdAt.toISOString()} | ws=${event.workspaceId} | user=${event.userId || 'null'} | ${event.action} | ${event.entityType || '-'}:${event.entityId || '-'}`,
    );
  }

  if (payload.recentEvents.length > 20) {
    console.log(`  ... (${payload.recentEvents.length - 20} more events omitted)`);
  }
}

run()
  .catch((error) => {
    console.error('Audit report generation failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
