import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                name: { label: 'Fornavn', type: 'text' },
                password: { label: 'Passord', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.name) {
                    throw new Error('Vennligst skriv inn fornavn');
                }

                const searchName = credentials.name.trim().toLowerCase();

                // Find user by name (case insensitive)
                const users = await prisma.user.findMany({
                    where: { active: true },
                });

                const user = users.find(
                    (u) => u.name.toLowerCase() === searchName
                );

                if (!user) {
                    throw new Error('Finner ikke bruker med det navnet');
                }

                // If user has a password, verify it
                if (user.password) {
                    if (!credentials.password) {
                        throw new Error('Passord er påkrevd');
                    }

                    const isValidPassword = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isValidPassword) {
                        throw new Error('Feil passord');
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id: string }).id = token.id as string;
                (session.user as { role: string }).role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
