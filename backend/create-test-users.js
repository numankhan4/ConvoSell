const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const TEST_USERS = [
  { email: 'owner@test.com', password: 'test123', firstName: 'Test', lastName: 'Owner', role: 'owner', workspaceName: 'Owner Test Workspace' },
  { email: 'admin@test.com', password: 'test123', firstName: 'Test', lastName: 'Admin', role: 'admin', workspaceName: 'Admin Test Workspace' },
  { email: 'manager@test.com', password: 'test123', firstName: 'Test', lastName: 'Manager', role: 'manager', workspaceName: 'Manager Test Workspace' },
  { email: 'agent@test.com', password: 'test123', firstName: 'Test', lastName: 'Agent', role: 'agent', workspaceName: 'Agent Test Workspace' },
  { email: 'viewer@test.com', password: 'test123', firstName: 'Test', lastName: 'Viewer', role: 'viewer', workspaceName: 'Viewer Test Workspace' }
];

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

async function createTestUsers() {
  try {
    console.log('🚀 Creating test users with separate workspaces (following normal signup flow)...\n');

    let existingCount = 0;
    let createdCount = 0;

    for (const testUser of TEST_USERS) {
      console.log(`\n📦 Creating ${testUser.role.toUpperCase()}: ${testUser.email}`);
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ 
        where: { email: testUser.email },
        include: {
          memberships: {
            include: {
              workspace: true
            }
          }
        }
      });

      if (existingUser) {
        existingCount++;
        console.log('  ✓ User already exists, skipping...');
        console.log(`    Workspace: ${existingUser.memberships[0]?.workspace?.name || 'No workspace'}`);
        console.log(`    Role: ${existingUser.memberships[0]?.role || 'No role'}`);
        continue;
      }

      // Create user + workspace + membership in transaction (like normal signup)
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: testUser.email,
            password: hashedPassword,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            isActive: true
          }
        });
        console.log('  ✅ Created user');

        // Create workspace (each user gets their own workspace like normal signup)
        const workspace = await tx.workspace.create({
          data: {
            name: testUser.workspaceName,
            slug: generateSlug(testUser.workspaceName),
            plan: 'free',
            isActive: true
          }
        });
        console.log(`  ✅ Created workspace: ${workspace.name}`);

        // Create workspace membership with the specified role
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: testUser.role,
            isActive: true
          }
        });
        console.log(`  ✅ Added user as ${testUser.role}`);

        return { user, workspace };
      });

      createdCount++;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    
    if (existingCount > 0 && createdCount === 0) {
      console.log('⚠️  ALL TEST USERS ALREADY EXIST');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('To recreate test users with separate workspaces:');
      console.log('1. Delete existing test users from the database');
      console.log('2. Run this script again\n');
      console.log('SQL to delete test users:');
      console.log('  DELETE FROM "WorkspaceMember" WHERE "userId" IN (');
      console.log('    SELECT id FROM "User" WHERE email LIKE \'%@test.com\'');
      console.log('  );');
      console.log('  DELETE FROM "User" WHERE email LIKE \'%@test.com\';\n');
    } else if (createdCount > 0) {
      console.log(`✅ Created ${createdCount} new test user(s)!`);
      console.log('═══════════════════════════════════════════════════════════════');
    }
    console.log('📋 TEST USER CREDENTIALS (Each with Own Workspace)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    TEST_USERS.forEach(u => {
      console.log(`${u.role.toUpperCase().padEnd(10)} → ${u.email.padEnd(25)} / ${u.password.padEnd(10)}`);
      console.log(`             Workspace: ${u.workspaceName}`);
      console.log('');
    });
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 TESTING WORKFLOW');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1. Login with owner@test.com (password: test123)');
    console.log('2. Go to Settings → Test Data → Generate Test Data');
    console.log('   ⚠️  Only OWNER role can generate/delete test data!');
    console.log('3. Use the User Switcher to impersonate other test users');
    console.log('4. Each test user has isolated workspace data for testing\n');
    console.log('💡 NOTE: Test data generation is restricted to workspace owners');
    console.log('   for security. Each test user is the owner of their workspace.\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
