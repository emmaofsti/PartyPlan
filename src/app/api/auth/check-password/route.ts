import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/auth/check-password - Check if a user has password set
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Navn er påkrevd' }, { status: 400 });
        }

        const searchName = name.trim().toLowerCase();

        // Find user by name (case insensitive)
        const users = await prisma.user.findMany({
            where: { active: true },
        });

        const user = users.find(
            (u) => u.name.toLowerCase() === searchName
        );

        if (!user) {
            return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 });
        }

        return NextResponse.json({
            hasPassword: !!user.password,
            userId: user.id,
        });
    } catch (error) {
        console.error('Error checking password:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
