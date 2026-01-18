import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/shifts/calendar - Get all shifts for calendar view
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');

        const where: { startsAt?: { gte?: Date; lte?: Date } } = {};

        if (startDate) {
            where.startsAt = { ...where.startsAt, gte: new Date(startDate) };
        }
        if (endDate) {
            where.startsAt = { ...where.startsAt, lte: new Date(endDate) };
        }

        const shifts = await prisma.shift.findMany({
            where: {
                ...where,
                status: 'PLANNED',
            },
            include: {
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                swapRequestsFrom: {
                    where: { status: 'PENDING' },
                    select: {
                        id: true,
                        status: true,
                        toUserId: true,
                        fromUserId: true,
                    }
                },
            },
            orderBy: { startsAt: 'asc' },
        });

        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching calendar shifts:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
