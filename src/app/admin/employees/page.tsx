'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    active: boolean;
}

export default function EmployeesPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'EMPLOYEE',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', phone: '', role: 'EMPLOYEE' });
        setSelectedUser(null);
        setFormError(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const editUser = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Password is optional when editing
            phone: user.phone || '',
            role: user.role,
        });
        setFormError(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            const url = selectedUser ? `/api/users/${selectedUser.id}` : '/api/users';
            const method = selectedUser ? 'PUT' : 'POST';

            // Remove empty password if editing
            const dataToSend = { ...formData };
            if (selectedUser && !dataToSend.password) {
                delete (dataToSend as any).password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchUsers();
            } else {
                const data = await res.json();
                setFormError(data.error || (selectedUser ? 'Kunne ikke oppdatere bruker' : 'Kunne ikke opprette bruker'));
            }
        } catch {
            setFormError('En feil oppstod');
        }

        setSubmitting(false);
    };

    const toggleActive = async (user: User, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        try {
            await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !user.active }),
            });
            fetchUsers();
        } catch (error) {
            console.error('Failed to toggle user:', error);
        }
    };

    return (
        <main className="main-content">
            <div className="page-header">
                <div>
                    <div className="breadcrumb">
                        <Link href="/admin">Admin</Link>
                        <span>/</span>
                        <span>Ansatte</span>
                    </div>
                    <h1>👥 Ansatte</h1>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary">
                    + Ny ansatt
                </button>
            </div>

            {loading ? (
                <div className="text-center mt-lg">
                    <span className="loading-spinner" />
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Navn</th>
                                <th>E-post</th>
                                <th>Telefon</th>
                                <th>Rolle</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    onClick={() => editUser(user)}
                                    className="clickable-row"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || '–'}</td>
                                    <td>
                                        <span className={`badge badge-${user.role.toLowerCase()}`}>
                                            {user.role === 'ADMIN' ? 'Admin' : 'Ansatt'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                            {user.active ? 'Aktiv' : 'Inaktiv'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={(e) => toggleActive(user, e)}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            {user.active ? 'Deaktiver' : 'Aktiver'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {selectedUser ? 'Rediger ansatt' : 'Ny ansatt'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {formError && (
                            <div className="alert alert-error mb-md">
                                <span>⚠️</span>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Navn *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">E-post *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Passord {selectedUser ? '(valgfritt)' : '*'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="form-input"
                                    required={!selectedUser}
                                    minLength={6}
                                    placeholder={selectedUser ? '•••••• (la stå tom for å beholde)' : ''}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Telefon</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Rolle</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="form-input form-select"
                                >
                                    <option value="EMPLOYEE">Ansatt</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>

                            <div className="flex gap-sm mt-lg">
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Lagrer...' : (selectedUser ? 'Lagre endringer' : 'Opprett ansatt')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Avbryt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-xl);
        }

        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-sm);
        }

        .breadcrumb a {
          color: var(--color-brand-secondary);
        }
        
        .clickable-row:hover {
            background-color: var(--color-bg-secondary);
        }
      `}</style>
        </main>
    );
}
