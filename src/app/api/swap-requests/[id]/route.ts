import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/swap-requests/[id] - Accept or decline a swap request
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body; // ACCEPTED or DECLINED

        if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
            return NextResponse.json(
                { error: 'Ugyldig status' },
                { status: 400 }
            );
        }

        // Get the swap request
        const swapRequest = await prisma.shiftSwapRequest.findUnique({
            where: { id },
            include: {
                fromShift: true,
                toShift: true,
            },
        });

        if (!swapRequest) {
            return NextResponse.json({ error: 'Forespørsel ikke funnet' }, { status: 404 });
        }

        // Only the recipient can accept/decline, unless it is an open request (toUserId is null)
        if (swapRequest.toUserId && swapRequest.toUserId !== session.user.id) {
            return NextResponse.json(
                { error: 'Bare mottakeren kan svare på forespørselen' },
                { status: 403 }
            );
        }

        if (swapRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Denne forespørselen er allerede besvart' },
                { status: 400 }
            );
        }

        if (status === 'ACCEPTED') {
            // Perform the actual swap or handover
            await prisma.$transaction(async (tx) => {
                // Determine target user (if open request, it's the current user)
                let toUserId = swapRequest.toUserId;
                if (!toUserId) {
                    toUserId = session.user.id;
                    // For open requests, we MUST update the request with the specific user who accepted
                    await tx.shiftSwapRequest.update({
                        where: { id },
                        data: { toUserId: session.user.id }
                    });
                }

                const toUser = await tx.user.findUnique({ where: { id: toUserId! } });

                if (swapRequest.toShiftId) {
                    // SWAP: Two-way trade

                    // Update fromShift title to toUser's name
                    await tx.shift.update({
                        where: { id: swapRequest.fromShiftId },
                        data: { title: toUser?.name || 'Vakt' },
                    });

                    // Update toShift title to fromUser's name
                    const fromUser = await tx.user.findUnique({ where: { id: swapRequest.fromUserId } });
                    await tx.shift.update({
                        where: { id: swapRequest.toShiftId },
                        data: { title: fromUser?.name || 'Vakt' },
                    });

                    // Swap the assignments
                    await tx.shiftAssignment.updateMany({
                        where: { shiftId: swapRequest.fromShiftId, userId: swapRequest.fromUserId },
                        data: { userId: toUserId! },
                    });

                    await tx.shiftAssignment.updateMany({
                        where: { shiftId: swapRequest.toShiftId, userId: toUserId! },
                        data: { userId: swapRequest.fromUserId },
                    });
                } else {
                    // GIVE AWAY: One-way transfer

                    // Update shift title to new owner's name
                    await tx.shift.update({
                        where: { id: swapRequest.fromShiftId },
                        data: { title: toUser?.name || 'Vakt' },
                    });

                    // Update assignment: change owner from sender to recipient
                    await tx.shiftAssignment.updateMany({
                        where: { shiftId: swapRequest.fromShiftId, userId: swapRequest.fromUserId },
                        data: { userId: toUserId! },
                    });
                }

                // Update request status
                await tx.shiftSwapRequest.update({
                    where: { id },
                    data: { status: 'ACCEPTED' },
                });
            });
        } else {
            // If declining an open request, we can't fully "DECLINE" it in DB because it should stay open for others.
            // Ideally we'd have a 'HiddenRequests' table. For now, we block declining open requests via API (frontend should handle UI).
            if (!swapRequest.toUserId) {
                return NextResponse.json(
                    { error: 'Du kan ikke avslå en åpen forespørsel (ignorer den i stedet)' },
                    { status: 400 }
                );
            }

            // Just mark as declined
            await prisma.shiftSwapRequest.update({
                where: { id },
                data: { status: 'DECLINED' },
            });
        }

        const updatedRequest = await prisma.shiftSwapRequest.findUnique({
            where: { id },
            include: {
                fromUser: { select: { id: true, name: true, phone: true } },
                toUser: { select: { id: true, name: true } },
                fromShift: true,
                toShift: true,
            },
        });

        // Send SMS to the requester if accepted
        // Send Push Notifications to the requester if accepted
        // Send Push Notifications
        if (updatedRequest && (status === 'ACCEPTED' || status === 'DECLINED')) {
            import('@/lib/web-push').then(async ({ sendWebPush }) => {
                const senderSubs = await prisma.pushSubscription.findMany({
                    where: { userId: updatedRequest.fromUserId }
                });

                let title = '';
                let message = '';
                const responderName = session.user.name || 'Noen';

                if (status === 'ACCEPTED') {
                    title = 'Vakt oppdatert ✅';
                    if (updatedRequest.toShift) {
                        message = `${responderName} godtok byttet.`;
                    } else {
                        message = `${responderName} tok vakten din.`;
                    }
                } else if (status === 'DECLINED') {
                    title = 'Forespørsel avvist ❌';
                    if (updatedRequest.toShift) {
                        message = `${responderName} avslo byttet.`;
                    } else {
                        message = `${responderName} avslo forespørselen.`;
                    }
                }

                if (message) {
                    senderSubs.forEach(sub => {
                        const subscription = {
                            endpoint: sub.endpoint,
                            keys: JSON.parse(sub.keys),
                        };
                        sendWebPush(subscription, {
                            title,
                            body: message,
                        }).catch(console.error);
                    });
                }
            });
        }

        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error('Error updating swap request:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}

// DELETE /api/swap-requests/[id] - Cancel a swap request
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
        }

        const swapRequest = await prisma.shiftSwapRequest.findUnique({
            where: { id },
        });

        if (!swapRequest) {
            return NextResponse.json({ error: 'Forespørsel ikke funnet' }, { status: 404 });
        }

        // Only the sender can cancel
        if (swapRequest.fromUserId !== session.user.id) {
            return NextResponse.json(
                { error: 'Bare avsender kan avbryte forespørselen' },
                { status: 403 }
            );
        }

        if (swapRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Kan bare avbryte ventende forespørsler' },
                { status: 400 }
            );
        }

        await prisma.shiftSwapRequest.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting swap request:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
