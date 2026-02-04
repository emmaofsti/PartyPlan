'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const checkPasswordRequirement = async (nameToCheck: string) => {
        if (!nameToCheck.trim()) return;

        try {
            const res = await fetch('/api/auth/check-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameToCheck }),
            });

            if (res.ok) {
                const data = await res.json();
                setShowPassword(data.hasPassword);
            }
        } catch (e) {
            console.error('Failed to check password status', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                name: name.trim(),
                password: showPassword ? password : undefined,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === 'Passord er påkrevd') {
                    setShowPassword(true);
                    setError('Dette brukernavnet krever passord');
                } else {
                    setError(result.error);
                }
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError('En feil oppstod. Prøv igjen.');
        }

        setLoading(false);
    };

    return (
        <>
            {error && (
                <div className="alert alert-error mb-md">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                    <label htmlFor="name" className="form-label">
                        Fornavn
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => checkPasswordRequirement(e.target.value)}
                        className="form-input"
                        placeholder="Skriv inn ditt fornavn"
                        required
                        autoFocus
                        autoComplete="username"
                    />
                </div>

                {showPassword && (
                    <div className="form-group slide-down">
                        <label htmlFor="password" className="form-label">
                            Passord
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="Skriv inn passord"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                )}


                <button
                    type="submit"
                    className="btn btn-primary btn-lg login-button"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="loading-spinner" />
                            Logger inn...
                        </>
                    ) : (
                        'Logg inn'
                    )}
                </button>
            </form >
        </>
    );
}

export default function LoginFormWrapper() {
    return <LoginForm />;
}
