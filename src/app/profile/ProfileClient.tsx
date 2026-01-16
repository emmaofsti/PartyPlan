'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: Date;
}

interface ProfileClientProps {
    user: User;
}

export default function ProfileClient({ user }: ProfileClientProps) {
    const router = useRouter();
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [phone, setPhone] = useState(user.phone || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone: phone || null }),
            });

            if (res.ok) {
                setSuccess(true);
                router.refresh();
                setTimeout(() => setSuccess(false), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Kunne ikke oppdatere profil');
            }
        } catch {
            setError('En feil oppstod');
        }

        setLoading(false);
    };

    return (
        <main className="main-content">
            <div className="profile-header">
                <h1>👤 Min profil</h1>
                <span className={`badge badge-${user.role.toLowerCase()}`}>
                    {user.role === 'ADMIN' ? 'Administrator' : 'Ansatt'}
                </span>
            </div>

            {success && (
                <div className="alert alert-success">
                    <span>✓</span>
                    Profilen ble oppdatert!
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="profile-form card">
                <div className="form-group">
                    <label htmlFor="name" className="form-label">Navn</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email" className="form-label">E-post</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="phone" className="form-label">Telefon</label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="form-input"
                        placeholder="+47 000 00 000"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Rolle</label>
                    <input
                        type="text"
                        value={user.role === 'ADMIN' ? 'Administrator' : 'Ansatt'}
                        className="form-input"
                        disabled
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="loading-spinner" />
                            Lagrer...
                        </>
                    ) : (
                        'Lagre endringer'
                    )}
                </button>
            </form>

            <style jsx>{`
        .profile-header {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
        }

        .profile-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }

        .profile-form {
          max-width: 500px;
        }

        .form-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--space-xs);
        }
      `}</style>
        </main>
    );
}
