import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            password: true,
            birthday: true,
            createdAt: true,
        },
    });

    if (!user) {
        redirect('/login');
    }

    const userWithPasswordStatus = {
        ...user,
        hasPassword: !!user.password,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userSafe } = userWithPasswordStatus;

    return <ProfileClient user={userSafe} hasPassword={userWithPasswordStatus.hasPassword} />;
}
