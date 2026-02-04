import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWebPush } from '@/lib/web-push';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. Security Check (Vercel Cron)
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Allow execution in development if no secret is set, or if secret matches
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // 2. Identify "Today" in Norway time
        // We want to find shifts that start "today".
        const now = new Date();
        const norwayTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));

        const startOfDay = new Date(norwayTime);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(norwayTime);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`Checking for shifts between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

        // 3. Fetch Shifts
        const shifts = await prisma.shift.findMany({
            where: {
                startsAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                assignments: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (shifts.length === 0) {
            return NextResponse.json({ message: 'No shifts today' });
        }

        // 4. Send Notifications
        const notifications = [];

        for (const shift of shifts) {
            for (const assignment of shift.assignments) {
                const user = assignment.user;
                if (!user) continue;

                // Find subscriptions for this user
                const subscriptions = await prisma.pushSubscription.findMany({
                    where: { userId: user.id }
                });

                for (const sub of subscriptions) {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: JSON.parse(sub.keys)
                    };

                    notifications.push(
                        sendWebPush(subscription, {
                            title: 'God morgen! ☀️',
                            body: `Husk at du skal jobbe i dag!`,
                            data: { url: '/dashboard' }
                        })
                    );
                }
            }
        }

        await Promise.all(notifications);

        return NextResponse.json({
            success: true,
            message: `Sent ${notifications.length} reminders for ${shifts.length} shifts.`
        });

    } catch (error) {
        console.error('Reminder Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
