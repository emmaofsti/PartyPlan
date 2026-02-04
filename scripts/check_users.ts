import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            name: true,
            password: true,
            role: true,
        }
    });

    console.log('User Password Status:');
    console.log('---------------------');
    users.forEach(u => {
        const hasPwd = !!u.password;
        const pwdLength = u.password ? u.password.length : 0;
        console.log(`User: ${u.name.padEnd(20)} | Role: ${u.role.padEnd(10)} | Has Password: ${hasPwd} | Hash Length: ${pwdLength}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
