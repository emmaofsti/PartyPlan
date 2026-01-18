import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate subscriptions...');

    const subs = await prisma.pushSubscription.findMany();
    const uniqueMap = new Map();
    const toDelete = [];

    for (const sub of subs) {
        const key = `${sub.userId}-${sub.endpoint}`;
        if (uniqueMap.has(key)) {
            toDelete.push(sub.id);
        } else {
            uniqueMap.set(key, true);
        }
    }

    console.log(`Found ${toDelete.length} duplicates.`);

    if (toDelete.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: {
                id: { in: toDelete },
            },
        });
        console.log('✅ Deleted duplicates.');
    } else {
        console.log('✨ No duplicates found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
