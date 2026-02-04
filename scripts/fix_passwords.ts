import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();

    let clearedCount = 0;

    for (const user of users) {
        // Check if password exists but is likely invalid (shorter than minimal bcrypt hash)
        // Bcrypt hashes are 60 chars.
        if (user.password && user.password.length < 50) {
            console.log(`Clearing invalid password for user: ${user.name} (Length: ${user.password.length})`);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: null }
            });
            clearedCount++;
        }
    }

    console.log(`\nFerdig! Slettet ugyldige passord fra ${clearedCount} brukere.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
