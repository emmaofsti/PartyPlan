import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Looking for user "Emma"...');

    const emma = await prisma.user.findFirst({
        where: {
            OR: [
                { name: { contains: 'Emma', mode: 'insensitive' } },
                { email: { contains: 'emma', mode: 'insensitive' } },
            ],
        },
    });

    if (!emma) {
        console.log('User "Emma" not found.');
        return;
    }

    console.log(`Found user: ${emma.name} (${emma.email}), role: ${emma.role}`);

    // Delete associated data first
    const deletedSwapRequests = await prisma.shiftSwapRequest.deleteMany({
        where: {
            OR: [
                { fromUserId: emma.id },
                { toUserId: emma.id },
            ],
        },
    });
    console.log(`Deleted ${deletedSwapRequests.count} swap requests involving Emma`);

    const deletedAssignments = await prisma.shiftAssignment.deleteMany({
        where: { userId: emma.id },
    });
    console.log(`Deleted ${deletedAssignments.count} shift assignments for Emma`);

    const deletedSubscriptions = await prisma.pushSubscription.deleteMany({
        where: { userId: emma.id },
    });
    console.log(`Deleted ${deletedSubscriptions.count} push subscriptions for Emma`);

    // Delete the user
    await prisma.user.delete({
        where: { id: emma.id },
    });

    console.log('✅ User "Emma" has been deleted from the database.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
