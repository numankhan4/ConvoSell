const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete all test users (emails ending with @test.com)
 * This allows recreating them with separate workspaces
 */
async function deleteTestUsers() {
  try {
    console.log('🗑️  Deleting test users and their data...\n');

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
            workspace: {
              include: {
                members: true
              }
            }
          }
        }
      }
    });

    if (testUsers.length === 0) {
      console.log('✓ No test users found.\n');
      return;
    }

    console.log(`Found ${testUsers.length} test user(s):`);
    testUsers.forEach(user => {
      console.log(`  • ${user.email} (${user.memberships.length} workspace(s))`);
    });
    console.log('');

    // Collect workspace IDs that are ONLY used by test users
    const workspacesToDelete = [];
    for (const user of testUsers) {
      for (const membership of user.memberships) {
        const workspace = membership.workspace;
        // Only delete workspace if ALL members are test users
        const hasNonTestMembers = workspace.members.some(
          m => !m.user?.email?.endsWith('@test.com')
        );
        if (!hasNonTestMembers && !workspacesToDelete.includes(workspace.id)) {
          workspacesToDelete.push(workspace.id);
        }
      }
    }

    console.log(`Will delete ${workspacesToDelete.length} workspace(s) that only contain test users...\n`);

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete workspace-related data
      for (const workspaceId of workspacesToDelete) {
        console.log(`Deleting data for workspace ${workspaceId}...`);
        
        // Delete in correct order due to foreign keys
        await tx.message.deleteMany({ where: { workspaceId } });
        await tx.conversation.deleteMany({ where: { workspaceId } });
        await tx.order.deleteMany({ where: { workspaceId } });
        await tx.contact.deleteMany({ where: { workspaceId } });
        await tx.automation.deleteMany({ where: { workspaceId } });
        await tx.whatsAppMessageTemplate.deleteMany({ where: { workspaceId } });
        await tx.workspaceMember.deleteMany({ where: { workspaceId } });
        await tx.workspace.delete({ where: { id: workspaceId } });
        
        console.log('  ✅ Workspace and all data deleted');
      }

      // Delete workspace memberships for test users in shared workspaces
      const deletedMemberships = await tx.workspaceMember.deleteMany({
        where: {
          userId: {
            in: testUsers.map(u => u.id)
          }
        }
      });
      console.log(`\n✅ Deleted ${deletedMemberships.count} workspace membership(s)`);

      // Delete test users
      const deletedUsers = await tx.user.deleteMany({
        where: {
          email: {
            endsWith: '@test.com'
          }
        }
      });
      console.log(`✅ Deleted ${deletedUsers.count} test user(s)`);
    });

    console.log('\n✅ All test users and their data have been deleted!');
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📝 NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Run: node create-test-users.js');
    console.log('This will create fresh test users with separate workspaces.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestUsers();
