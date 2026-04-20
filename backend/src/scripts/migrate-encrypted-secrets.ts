import { PrismaClient } from '@prisma/client';
import { encryptSecret, isEncryptedSecret } from '../common/utils/crypto.util';

const prisma = new PrismaClient();

type MigrationOptions = {
  dryRun: boolean;
  json: boolean;
};

type MigrationSummary = {
  scanned: number;
  candidates: number;
  updated: number;
};

function getUpdatedSecretValue(value: string | null): string | null {
  if (!value) return value;
  if (isEncryptedSecret(value)) return value;
  return encryptSecret(value) as string;
}

function parseOptions(): MigrationOptions {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    json: args.has('--json'),
  };
}

function isEncryptionKeyConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_CRM_ENCRYPTION_KEY);
}

async function migrateWhatsAppSecrets(options: MigrationOptions): Promise<MigrationSummary> {
  const rows = await prisma.whatsAppIntegration.findMany({
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
    },
  });

  let candidateRows = 0;
  let updatedRows = 0;

  for (const row of rows) {
    const shouldRotateAccessToken = !!row.accessToken && !isEncryptedSecret(row.accessToken);
    const shouldRotateRefreshToken = !!row.refreshToken && !isEncryptedSecret(row.refreshToken);

    if (shouldRotateAccessToken || shouldRotateRefreshToken) {
      candidateRows += 1;
    }

    if (options.dryRun) {
      continue;
    }

    const nextAccessToken = getUpdatedSecretValue(row.accessToken);
    const nextRefreshToken = getUpdatedSecretValue(row.refreshToken);

    const data: { accessToken?: string; refreshToken?: string | null } = {};

    if (nextAccessToken !== row.accessToken && nextAccessToken) {
      data.accessToken = nextAccessToken;
    }
    if (nextRefreshToken !== row.refreshToken) {
      data.refreshToken = nextRefreshToken;
    }

    if (Object.keys(data).length > 0) {
      await prisma.whatsAppIntegration.update({
        where: { id: row.id },
        data,
      });
      updatedRows += 1;
    }
  }

  return {
    scanned: rows.length,
    candidates: candidateRows,
    updated: updatedRows,
  };
}

async function migrateShopifySecrets(options: MigrationOptions): Promise<MigrationSummary> {
  const rows = await prisma.shopifyStore.findMany({
    select: {
      id: true,
      clientSecret: true,
      accessToken: true,
      oauthAccessToken: true,
    },
  });

  let candidateRows = 0;
  let updatedRows = 0;

  for (const row of rows) {
    const shouldRotateClientSecret = !!row.clientSecret && !isEncryptedSecret(row.clientSecret);
    const shouldRotateAccessToken = !!row.accessToken && !isEncryptedSecret(row.accessToken);
    const shouldRotateOauthAccessToken =
      !!row.oauthAccessToken && !isEncryptedSecret(row.oauthAccessToken);

    if (shouldRotateClientSecret || shouldRotateAccessToken || shouldRotateOauthAccessToken) {
      candidateRows += 1;
    }

    if (options.dryRun) {
      continue;
    }

    const nextClientSecret = getUpdatedSecretValue(row.clientSecret);
    const nextAccessToken = getUpdatedSecretValue(row.accessToken);
    const nextOauthAccessToken = getUpdatedSecretValue(row.oauthAccessToken);

    const data: {
      clientSecret?: string | null;
      accessToken?: string | null;
      oauthAccessToken?: string | null;
    } = {};

    if (nextClientSecret !== row.clientSecret) {
      data.clientSecret = nextClientSecret;
    }
    if (nextAccessToken !== row.accessToken) {
      data.accessToken = nextAccessToken;
    }
    if (nextOauthAccessToken !== row.oauthAccessToken) {
      data.oauthAccessToken = nextOauthAccessToken;
    }

    if (Object.keys(data).length > 0) {
      await prisma.shopifyStore.update({
        where: { id: row.id },
        data,
      });
      updatedRows += 1;
    }
  }

  return {
    scanned: rows.length,
    candidates: candidateRows,
    updated: updatedRows,
  };
}

function printSummary(options: MigrationOptions, whatsapp: MigrationSummary, shopify: MigrationSummary) {
  const summary = {
    mode: options.dryRun ? 'dry-run' : 'apply',
    whatsapp,
    shopify,
    totals: {
      scanned: whatsapp.scanned + shopify.scanned,
      candidates: whatsapp.candidates + shopify.candidates,
      updated: whatsapp.updated + shopify.updated,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Mode: ${summary.mode}`);
  console.log('Secret encryption migration summary:');
  console.log(
    `WhatsApp integrations: scanned=${whatsapp.scanned}, candidates=${whatsapp.candidates}, updated=${whatsapp.updated}`,
  );
  console.log(
    `Shopify stores: scanned=${shopify.scanned}, candidates=${shopify.candidates}, updated=${shopify.updated}`,
  );
  console.log(
    `Totals: scanned=${summary.totals.scanned}, candidates=${summary.totals.candidates}, updated=${summary.totals.updated}`,
  );
}

async function main() {
  const options = parseOptions();

  if (!options.dryRun && !isEncryptionKeyConfigured()) {
    throw new Error(
      'WHATSAPP_CRM_ENCRYPTION_KEY is required before running this migration. Set it and rerun.',
    );
  }

  console.log(
    `Starting secret encryption migration (${options.dryRun ? 'dry-run' : 'apply'} mode)...`,
  );

  const whatsapp = await migrateWhatsAppSecrets(options);
  const shopify = await migrateShopifySecrets(options);

  printSummary(options, whatsapp, shopify);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });