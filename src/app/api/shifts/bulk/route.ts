import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface BulkShiftInput {
    date: string;       // YYYY-MM-DD
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
    userId: string;
    userName: string;
}

// POST /api/shifts/bulk - Create multiple shifts at once (admin only)
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
        const { shifts } = body as { shifts: BulkShiftInput[] };

        if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
            return NextResponse.json({ error: 'Ingen vakter å opprette' }, { status: 400 });
        }

        // Use a transaction to create all shifts atomically
        const createdShifts = await prisma.$transaction(
            shifts.map((s) => {
                const startsAt = new Date(`${s.date}T${s.startTime}:00`);
                const endsAt = new Date(`${s.date}T${s.endTime}:00`);

                // Handle overnight shifts
                if (endsAt <= startsAt) {
                    endsAt.setDate(endsAt.getDate() + 1);
                }

                return prisma.shift.create({
                    data: {
                        title: s.userName,
                        startsAt,
                        endsAt,
                        location: '-',
                        status: 'PLANNED',
                        assignments: {
                            create: {
                                userId: s.userId,
                                assignmentStatus: 'ASSIGNED',
                            },
                        },
                    },
                    include: {
                        assignments: {
                            include: {
                                user: { select: { id: true, name: true } },
                            },
                        },
                    },
                });
            })
        );

        return NextResponse.json({ created: createdShifts.length, shifts: createdShifts }, { status: 201 });
    } catch (error) {
        console.error('Error creating bulk shifts:', error);
        return NextResponse.json({ error: 'Serverfeil ved bulkopprettelse' }, { status: 500 });
    }
}

// DELETE /api/shifts/bulk - Delete multiple shifts at once (admin only)
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
        }

        const body = await request.json();
        const { shiftIds } = body as { shiftIds: string[] };

        if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
            return NextResponse.json({ error: 'Ingen vakter å slette' }, { status: 400 });
        }

        await prisma.shift.deleteMany({
            where: { id: { in: shiftIds } },
        });

        return NextResponse.json({ deleted: shiftIds.length });
    } catch (error) {
        console.error('Error deleting bulk shifts:', error);
        return NextResponse.json({ error: 'Serverfeil ved bulksletting' }, { status: 500 });
    }
}
