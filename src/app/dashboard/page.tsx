import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    // Fetch user's upcoming shifts
    const assignments = await prisma.shiftAssignment.findMany({
        where: {
            userId: session.user.id,
            shift: {
                startsAt: { gte: new Date() },
            },
        },
        include: {
            shift: {
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
                },
            },
        },
        orderBy: {
            shift: {
                startsAt: 'asc',
            },
        },
    });

    const shifts = assignments.map((a) => ({
        ...a.shift,
        assignmentId: a.id,
        assignmentStatus: a.assignmentStatus,
    }));

    return <DashboardClient shifts={shifts} userName={session.user.name} userId={session.user.id} userRole={session.user.role} />;
}
