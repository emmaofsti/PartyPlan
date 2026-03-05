import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const shiftCount = await prisma.shift.count();
        const userCount = await prisma.user.count();
        const shifts = await prisma.shift.findMany({
            take: 5,
            orderBy: { startsAt: 'desc' },
            include: { assignments: { include: { user: true } } }
        });

        console.log(`Summary:`);
        console.log(`Shifts: ${shiftCount}`);
        console.log(`Users: ${userCount}`);
        console.log(`\nLast 5 shifts:`);
        shifts.forEach(s => {
            console.log(`- ${s.startsAt.toISOString()} | ${s.assignments.map(a => a.user.name).join(', ')}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
