import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/assignments/[id] - Update assignment
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const body = await request.json();
        const { assignmentStatus } = body;

        // Get the assignment
        const existingAssignment = await prisma.shiftAssignment.findUnique({
            where: { id },
        });

        if (!existingAssignment) {
            return NextResponse.json(
                { error: 'Tildeling ikke funnet' },
                { status: 404 }
            );
        }

        // Only admin can change any assignment, employees can only confirm/decline their own
        if (session.user.role !== 'ADMIN') {
            if (existingAssignment.userId !== session.user.id) {
                return NextResponse.json({ error: 'Ikke tilgang' }, { status: 403 });
            }
            // Employees can only set to CONFIRMED or DECLINED
            if (!['CONFIRMED', 'DECLINED'].includes(assignmentStatus)) {
                return NextResponse.json(
                    { error: 'Du kan bare bekrefte eller avslå vakten' },
                    { status: 400 }
                );
            }
        }

        const assignment = await prisma.shiftAssignment.update({
            where: { id },
            data: {
                assignmentStatus: assignmentStatus || undefined,
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

        return NextResponse.json(assignment);
    } catch (error) {
        console.error('Error updating assignment:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// DELETE /api/assignments/[id] - Delete assignment (admin only)
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

        await prisma.shiftAssignment.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
