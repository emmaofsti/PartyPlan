'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                name: name.trim(),
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
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
                        className="form-input"
                        placeholder="Skriv inn ditt fornavn"
                        required
                        autoFocus
                        autoComplete="name"
                    />
                </div>

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
            </form>
        </>
    );
}

export default function LoginFormWrapper() {
    return <LoginForm />;
}
