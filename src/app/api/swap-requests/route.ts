import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/swap-requests - Get swap requests for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        // Get both incoming and outgoing swap requests
        const swapRequests = await prisma.shiftSwapRequest.findMany({
            where: {
                OR: [
                    { fromUserId: session.user.id },
                    { toUserId: session.user.id },
                ],
            },
            include: {
                fromUser: { select: { id: true, name: true } },
                toUser: { select: { id: true, name: true } },
                fromShift: true,
                toShift: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(swapRequests);
    } catch (error) {
        console.error('Error fetching swap requests:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// POST /api/swap-requests - Create a swap request
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const body = await request.json();
        const { fromShiftId, toShiftId, toUserId, message } = body;

        if (!fromShiftId || !toShiftId || !toUserId) {
            return NextResponse.json(
                { error: 'Begge vakter og mottaker er påkrevd' },
                { status: 400 }
            );
        }

        // Verify the user owns the fromShift
        const fromAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                shiftId: fromShiftId,
                userId: session.user.id,
            },
            include: { shift: true }
        });

        if (!fromAssignment) {
            return NextResponse.json(
                { error: 'Du kan bare bytte dine egne vakter' },
                { status: 403 }
            );
        }

        // Verify the target user owns the toShift
        const toAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                shiftId: toShiftId,
                userId: toUserId,
            },
        });

        if (!toAssignment) {
            return NextResponse.json(
                { error: 'Den valgte vakten tilhører ikke denne brukeren' },
                { status: 400 }
            );
        }

        // Create swap request
        const swapRequest = await prisma.shiftSwapRequest.create({
            data: {
                fromUserId: session.user.id,
                toUserId,
                fromShiftId,
                toShiftId,
                message: message || null,
                status: 'PENDING',
            },
            include: {
                fromUser: { select: { id: true, name: true } },
                toUser: { select: { id: true, name: true, phone: true } },
                fromShift: true,
                toShift: true,
            },
        });

        // Send Push Notification to the recipient
        // We do this asynchronously and don't block the response if it fails
        const recipientSubscriptions = await prisma.pushSubscription.findMany({
            where: { userId: toUserId },
        });

        if (recipientSubscriptions.length > 0) {
            import('@/lib/web-push').then(({ sendWebPush }) => {
                const message = `Hei! ${session.user.name} ønsker å bytte vakt med deg: ${fromAssignment.shift.title} (${new Date(fromAssignment.shift.startsAt).toLocaleDateString()}). Svar i vaktplan-appen.`;

                recipientSubscriptions.forEach(sub => {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: JSON.parse(sub.keys),
                    };
                    sendWebPush(subscription, {
                        title: 'Nytt vaktbytte! 🔄',
                        body: message,
                    }).catch(console.error);
                });
            });
        }

        return NextResponse.json(swapRequest, { status: 201 });
    } catch (error) {
        console.error('Error creating swap request:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
