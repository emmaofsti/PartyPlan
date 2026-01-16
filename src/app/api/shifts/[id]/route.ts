import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/shifts/[id] - Get shift by ID
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const shift = await prisma.shift.findUnique({
            where: { id },
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
            },
        });

        if (!shift) {
            return NextResponse.json({ error: 'Vakt ikke funnet' }, { status: 404 });
        }

        // If employee, check if they are assigned to this shift
        if (session.user.role !== 'ADMIN') {
            const isAssigned = shift.assignments.some(
                (a) => a.userId === session.user.id
            );
            if (!isAssigned) {
                return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
            }
        }

        return NextResponse.json(shift);
    } catch (error) {
        console.error('Error fetching shift:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// PUT /api/shifts/[id] - Update shift (admin only)
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
        const { title, startsAt, endsAt, location, notes, status } = body;

        // Validate times if provided
        if (startsAt && endsAt) {
            const startDate = new Date(startsAt);
            const endDate = new Date(endsAt);
            if (endDate <= startDate) {
                return NextResponse.json(
                    { error: 'Sluttid må være etter starttid' },
                    { status: 400 }
                );
            }
        }

        const shift = await prisma.shift.update({
            where: { id },
            data: {
                title: title || undefined,
                startsAt: startsAt ? new Date(startsAt) : undefined,
                endsAt: endsAt ? new Date(endsAt) : undefined,
                location: location || undefined,
                notes: notes !== undefined ? notes : undefined,
                status: status || undefined,
            },
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
            },
        });

        return NextResponse.json(shift);
    } catch (error) {
        console.error('Error updating shift:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// DELETE /api/shifts/[id] - Delete shift (admin only)
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

        await prisma.shift.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shift:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
