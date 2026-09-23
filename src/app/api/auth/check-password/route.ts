import { NextResponse } from 'next/server';
import { findLoginCandidates } from '@/lib/auth';

// POST /api/auth/check-password - Check if a user has password set
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Navn er påkrevd' }, { status: 400 });
        }

        const candidates = await findLoginCandidates(name);

        if (candidates.length === 0) {
            return NextResponse.json({ error: 'Bruker ikke funnet' }, { status: 404 });
        }

        return NextResponse.json({
            hasPassword: candidates.some((u) => !!u.password),
        });
    } catch (error) {
        console.error('Error checking password:', error);
        return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
    }
}
