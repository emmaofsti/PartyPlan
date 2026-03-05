import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const febStart = new Date('2026-02-01T00:00:00Z');
        const febEnd = new Date('2026-03-01T00:00:00Z');

        const febShifts = await prisma.shift.count({
            where: {
                startsAt: {
                    gte: febStart,
                    lt: febEnd
                }
            }
        });

        console.log(`Shifts in February 2026: ${febShifts}`);

        if (febShifts > 0) {
            const sample = await prisma.shift.findMany({
                where: {
                    startsAt: {
                        gte: febStart,
                        lt: febEnd
                    }
                },
                take: 3,
                include: { assignments: { include: { user: true } } }
            });
            sample.forEach(s => {
                console.log(`- ${s.startsAt.toISOString()} | ${s.assignments.map(a => a.user.name).join(', ')}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
