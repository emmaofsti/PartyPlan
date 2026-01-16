import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/assignments - Get all assignments (admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        const assignments = await prisma.shiftAssignment.findMany({
            include: {
                shift: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// POST /api/assignments - Create assignment (admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        const body = await request.json();
        const { shiftId, userId, assignmentStatus } = body;

        if (!shiftId || !userId) {
            return NextResponse.json(
                { error: 'Vakt og ansatt er påkrevd' },
                { status: 400 }
            );
        }

        // Check if assignment already exists
        const existingAssignment = await prisma.shiftAssignment.findUnique({
            where: {
                shiftId_userId: { shiftId, userId },
            },
        });

        if (existingAssignment) {
            return NextResponse.json(
                { error: 'Denne ansatte er allerede tildelt denne vakten' },
                { status: 400 }
            );
        }

        // Check for overlapping shifts
        const shift = await prisma.shift.findUnique({
            where: { id: shiftId },
        });

        if (!shift) {
            return NextResponse.json({ error: 'Vakt ikke funnet' }, { status: 404 });
        }

        const overlappingAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId,
                shift: {
                    id: { not: shiftId },
                    OR: [
                        {
                            startsAt: { lt: shift.endsAt },
                            endsAt: { gt: shift.startsAt },
                        },
                    ],
                },
            },
            include: { shift: true },
        });

        if (overlappingAssignment) {
            return NextResponse.json(
                {
                    error: `Advarsel: Denne ansatte har overlappende vakt (${overlappingAssignment.shift.title})`,
                    warning: true,
                },
                { status: 409 }
            );
        }

        const assignment = await prisma.shiftAssignment.create({
            data: {
                shiftId,
                userId,
                assignmentStatus: assignmentStatus || 'ASSIGNED',
            },
            include: {
                shift: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(assignment, { status: 201 });
    } catch (error) {
        console.error('Error creating assignment:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
