import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const normalizeName = (name: string) =>
    name.trim().replace(/\s+/g, ' ').toLowerCase();

// Find active users matching a login name. Exact full-name matches win;
// otherwise match on first name, so "Ola" finds "Ola Nordmann".
// May return several users when first names are shared.
export async function findLoginCandidates(name: string) {
    const searchName = normalizeName(name);
    const users = await prisma.user.findMany({ where: { active: true } });

    const exact = users.filter((u) => normalizeName(u.name) === searchName);
    if (exact.length > 0) return exact;

    return users.filter((u) => normalizeName(u.name).split(' ')[0] === searchName);
}

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

                const candidates = await findLoginCandidates(credentials.name);

                if (candidates.length === 0) {
                    throw new Error('Finner ikke bruker med det navnet');
                }

                let user = candidates.length === 1 ? candidates[0] : null;

                if (candidates.some((u) => u.password)) {
                    if (!credentials.password) {
                        throw new Error('Passord er påkrevd');
                    }

                    // With shared first names, the password decides who is logging in
                    user = null;
                    for (const candidate of candidates) {
                        if (
                            candidate.password &&
                            (await bcrypt.compare(credentials.password, candidate.password))
                        ) {
                            user = candidate;
                            break;
                        }
                    }

                    if (!user) {
                        throw new Error('Feil passord');
                    }
                } else if (!user) {
                    throw new Error('Flere har dette fornavnet – skriv fullt navn');
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
