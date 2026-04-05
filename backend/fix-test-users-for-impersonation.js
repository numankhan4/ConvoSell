const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Fix test user setup for role-based impersonation
 * Moves all test users into a SHARED workspace with their designated roles
 * This allows owner to impersonate all other test users
 */

async function fixTestUsersForImpersonation() {
  try {
    console.log('🔧 Fixing test users for impersonation...\n');

    // Find all test users
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@test.com'
        }
      },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      },
      orderBy: {
        email: 'asc'
      }
    });

    if (testUsers.length === 0) {
      console.log('⚠️  No test users found. Run create-test-users.js first.\n');
      return;
    }

    console.log(`Found ${testUsers.length} test user(s)\n`);

    // Find the owner test user
    const ownerUser = testUsers.find(u => u.email === 'owner@test.com');
    if (!ownerUser) {
      console.error('❌ Owner test user not found!');
      return;
    }

    // Get or create shared workspace
    let sharedWorkspace = ownerUser.memberships[0]?.workspace;
    
    if (!sharedWorkspace) {
      console.log('Creating new shared workspace...');
      sharedWorkspace = await prisma.workspace.create({
        data: {
          name: 'RBAC Testing Workspace',
          slug: `rbac-testing-${Math.random().toString(36).substring(2, 8)}`,
          plan: 'free',
          isActive: true
        }
      });
      
      // Add owner to new workspace
      await prisma.workspaceMember.create({
        data: {
          workspaceId: sharedWorkspace.id,
          userId: ownerUser.id,
          role: 'owner',
          isActive: true
        }
      });
      console.log('  ✅ Created shared workspace and added owner\n');
    } else {
      // Rename existing workspace for clarity
      await prisma.workspace.update({
        where: { id: sharedWorkspace.id },
        data: { name: 'RBAC Testing Workspace' }
      });
      console.log(`✅ Using existing workspace: ${sharedWorkspace.name}\n`);
    }

    // Role mapping for test users
    const roleMap = {
      'owner@test.com': 'owner',
      'admin@test.com': 'admin',
      'manager@test.com': 'manager',
      'agent@test.com': 'agent',
      'viewer@test.com': 'viewer',
    };

    // Add all test users to the shared workspace
    console.log(`Adding all test users to shared workspace...\n`);
    
    for (const user of testUsers) {
      const targetRole = roleMap[user.email] || 'viewer';
      
      // Check if user already in shared workspace
      const existingMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: sharedWorkspace.id,
            userId: user.id
          }
        }
      });

      if (existingMembership) {
        if (existingMembership.role !== targetRole) {
          await prisma.workspaceMember.update({
            where: { id: existingMembership.id },
            data: { role: targetRole, isActive: true }
          });
          console.log(`  ✅ ${user.email.padEnd(25)} → Updated to ${targetRole}`);
        } else {
          console.log(`  ✓ ${user.email.padEnd(25)} → Already ${targetRole}`);
        }
      } else {
        await prisma.workspaceMember.create({
          data: {
            workspaceId: sharedWorkspace.id,
            userId: user.id,
            role: targetRole,
            isActive: true
          }
        });
        console.log(`  ✅ ${user.email.padEnd(25)} → Added as ${targetRole}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST USERS FIXED FOR IMPERSONATION!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📋 All ${testUsers.length} test users are now in the shared workspace:`);
    console.log(`   Workspace: "${sharedWorkspace.name}"\n`);
    console.log('🧪 TESTING WORKFLOW:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('1. Login as owner@test.com (password: test123)');
    console.log('2. Use User Switcher (top right) to impersonate:');
    console.log('   • admin@test.com   → Test admin permissions');
    console.log('   • manager@test.com → Test manager permissions');
    console.log('   • agent@test.com   → Test agent permissions');
    console.log('   • viewer@test.com  → Test viewer permissions');
    console.log('3. Click "Return to Owner" to go back\n');
    console.log('💡 All users share the same workspace data for consistent testing!\n');
    console.log('🔍 To generate test data: node generate-all-test-data.js\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTestUsersForImpersonation();
