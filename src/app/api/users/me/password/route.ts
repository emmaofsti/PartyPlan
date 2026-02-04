import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// PUT /api/users/me/password - Set or update password
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const body = await request.json();
        const { password, currentPassword } = body;

        if (!password || password.length < 4) {
            return NextResponse.json(
                { error: 'Passord må være minst 4 tegn' },
                { status: 400 }
            );
        }

        // Get current user to check if they already have a password
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        });



        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ success: true, message: 'Passord oppdatert' });
    } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// DELETE /api/users/me/password - Remove password
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: null },
        });

        return NextResponse.json({ success: true, message: 'Passord fjernet' });
    } catch (error) {
        console.error('Error removing password:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
