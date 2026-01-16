import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/users/[id]/shifts - Get shifts for a specific user
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        // Get upcoming shifts for this user
        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: id,
                shift: {
                    startsAt: { gte: new Date() },
                    status: 'PLANNED',
                },
            },
            include: {
                shift: true,
            },
            orderBy: {
                shift: { startsAt: 'asc' },
            },
        });

        const shifts = assignments.map((a: { shift: object }) => a.shift);

        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching user shifts:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
