import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/users/me - Get current user profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                active: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// PUT /api/users/me - Update current user profile
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone } = body;

        // Allow updating name, email and phone for own profile
        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name || undefined,
                email: email || undefined,
                phone: phone !== undefined ? phone : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                active: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error updating user profile:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
