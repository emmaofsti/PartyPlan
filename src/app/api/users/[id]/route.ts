import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID (admin only)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id },
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
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, phone, role, active } = body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                name: name || undefined,
                email: email || undefined,
                phone: phone !== undefined ? phone : undefined,
                role: role || undefined,
                active: active !== undefined ? active : undefined,
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
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// DELETE /api/users/[id] - Deactivate user (admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        // Soft delete - just deactivate
        await prisma.user.update({
            where: { id },
            data: { active: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
