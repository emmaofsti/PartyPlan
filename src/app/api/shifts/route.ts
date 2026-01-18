import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/shifts - Get shifts (filtered by role)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const upcoming = searchParams.get('upcoming') === 'true';

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status) {
            where.status = status;
        }

        if (upcoming) {
            where.startsAt = { gte: new Date() };
        }

        // If employee, only show their assigned shifts
        if (session.user.role !== 'ADMIN') {
            where.assignments = {
                some: { userId: session.user.id },
            };
        }

        const shifts = await prisma.shift.findMany({
            where,
            include: {
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                swapRequestsFrom: {
                    where: { status: 'PENDING' },
                    select: { id: true, fromUserId: true, toUserId: true, toShiftId: true }
                },
            },
            orderBy: { startsAt: 'asc' },
        });

        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// POST /api/shifts - Create new shift (admin only)
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
        const { title, startsAt, endsAt, location, notes, status, userId } = body;

        // Validation
        if (!title || !startsAt || !endsAt || !location) {
            return NextResponse.json(
                { error: 'Tittel, start, slutt og lokasjon er påkrevd' },
                { status: 400 }
            );
        }

        const startDate = new Date(startsAt);
        const endDate = new Date(endsAt);

        if (endDate <= startDate) {
            return NextResponse.json(
                { error: 'Sluttid må være etter starttid' },
                { status: 400 }
            );
        }

        const shift = await prisma.shift.create({
            data: {
                title,
                startsAt: startDate,
                endsAt: endDate,
                location,
                notes: notes || null,
                status: status || 'PLANNED',
                assignments: userId ? {
                    create: {
                        userId: userId,
                        assignmentStatus: 'ASSIGNED',
                    }
                } : undefined,
            },
            include: {
                assignments: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
            },
        });

        return NextResponse.json(shift, { status: 201 });
    } catch (error) {
        console.error('Error creating shift:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
