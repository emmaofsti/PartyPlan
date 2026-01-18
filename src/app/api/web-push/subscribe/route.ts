
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 });
    }

    try {
        const subscription = await request.json();

        // Check if subscription already exists
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                userId: session.user.id,
                endpoint: subscription.endpoint,
            },
        });

        if (existing) {
            // Update keys just in case they changed
            await prisma.pushSubscription.update({
                where: { id: existing.id },
                data: {
                    keys: JSON.stringify(subscription.keys),
                },
            });
        } else {
            await prisma.pushSubscription.create({
                data: {
                    userId: session.user.id,
                    endpoint: subscription.endpoint,
                    keys: JSON.stringify(subscription.keys),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
