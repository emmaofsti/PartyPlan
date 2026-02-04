import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                active: true,
                birthday: { not: null }
            },
            select: {
                name: true,
                birthday: true
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching birthdays:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
