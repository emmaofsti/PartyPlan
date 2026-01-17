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
        // Also get OPEN requests (where toUserId is null, and fromUserId is NOT me)
        const swapRequests = await prisma.shiftSwapRequest.findMany({
            where: {
                OR: [
                    { fromUserId: session.user.id },
                    { toUserId: session.user.id },
                    {
                        AND: [
                            { toUserId: null },
                            { fromUserId: { not: session.user.id } }
                        ]
                    }
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

        // Validation: fromShiftId is required. toUserId is OPTIONAL now (for open requests).
        if (!fromShiftId) {
            return NextResponse.json(
                { error: 'Vakt er påkrevd' },
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

        // If toShiftId is present, verify ownership (this implies a specific person swap)
        let toAssignment = null;
        if (toShiftId) {
            if (!toUserId) {
                return NextResponse.json(
                    { error: 'Mottaker må velges ved bytte mot spesifikk vakt' },
                    { status: 400 }
                );
            }

            toAssignment = await prisma.shiftAssignment.findFirst({
                where: {
                    shiftId: toShiftId,
                    userId: toUserId,
                },
                include: { shift: true }
            });

            if (!toAssignment) {
                return NextResponse.json(
                    { error: 'Den valgte vakten tilhører ikke denne brukeren' },
                    { status: 400 }
                );
            }
        }

        // Create swap request
        const swapRequest = await prisma.shiftSwapRequest.create({
            data: {
                fromUserId: session.user.id,
                toUserId: toUserId || null, // Can be null for open request
                fromShiftId,
                toShiftId: toShiftId || null,
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

        // Send Push Notifications
        import('@/lib/web-push').then(async ({ sendWebPush }) => {
            const shiftDate = new Date(fromAssignment.shift.startsAt);
            const dateStr = shiftDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });
            const timeStr = shiftDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

            // Scenario 1: Specific Recipient
            if (toUserId) {
                const recipientSubscriptions = await prisma.pushSubscription.findMany({
                    where: { userId: toUserId },
                });

                let messageBody = '';
                if (toShiftId && toAssignment) {
                    messageBody = `Hei! ${session.user.name} ønsker å bytte vakt med deg: ${fromAssignment.shift.title} (${dateStr}) mot din vakt ${toAssignment.shift.title}. Svar i vaktplan-appen.`;
                } else {
                    messageBody = `Hei! ${session.user.name} ønsker å gi bort vakt til deg: ${fromAssignment.shift.title} (${dateStr}). Svar i vaktplan-appen.`;
                }

                recipientSubscriptions.forEach(sub => {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: JSON.parse(sub.keys),
                    };
                    sendWebPush(subscription, {
                        title: toShiftId ? 'Nytt vaktbytte! 🔄' : 'Vakt gis bort! 🎁',
                        body: messageBody,
                    }).catch(console.error);
                });
            }
            // Scenario 2: Open Request (Broadcast)
            else {
                // Fetch all users except sender
                // Ideally we filter by those who can actually take the shift (e.g. active employees), 
                // but for now we look for all PushSubscriptions where userId != sender
                const allSubscriptions = await prisma.pushSubscription.findMany({
                    where: {
                        userId: { not: session.user.id }
                    }
                });

                // Message format: "[Sender] vil gi bort vakt [dato], [tid]. Kan du jobbe?"
                const broadcastBody = `${session.user.name} vil gi bort vakt ${dateStr}, ${timeStr}. Kan du jobbe?`;

                allSubscriptions.forEach(sub => {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: JSON.parse(sub.keys),
                    };
                    sendWebPush(subscription, {
                        title: 'Ledig vakt! 🎁',
                        body: broadcastBody,
                    }).catch(console.error);
                });
            }
        });

        return NextResponse.json(swapRequest, { status: 201 });
    } catch (error) {
        console.error('Error creating swap request:', error);
        return NextResponse.json({
            error: 'Serverfeil',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
