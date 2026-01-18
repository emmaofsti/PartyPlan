import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Finding user Mia...');

    const mia = await prisma.user.findUnique({
        where: { email: 'mia@vaktplan.no' },
    });

    if (!mia) {
        console.log('❌ Could not find user: mia@vaktplan.no');
        return;
    }

    console.log(`👤 Found Mia (ID: ${mia.id})`);

    const deleted = await prisma.shiftSwapRequest.deleteMany({
        where: {
            fromUserId: mia.id,
        },
    });

    console.log(`✅ Deleted ${deleted.count} requests from Mia.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
