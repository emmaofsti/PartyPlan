'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatTimeRange } from '@/lib/utils';

interface User {
    id: string;
    name: string;
}

interface Shift {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    location: string;
    notes: string | null;
    status: string;
    assignments: { id: string; user: { id: string; name: string } }[];
}

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        userId: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [shiftsRes, usersRes] = await Promise.all([
                fetch('/api/shifts'),
                fetch('/api/users'),
            ]);
            if (shiftsRes.ok) setShifts(await shiftsRes.json());
            if (usersRes.ok) {
                const allUsers = await usersRes.json();
                // Filter out Emma (owner, not an employee)
                setUsers(allUsers.filter((u: User) => u.name.toLowerCase() !== 'emma'));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            // Combine date with times
            const startsAt = new Date(`${formData.date}T${formData.startTime}`);
            const endsAt = new Date(`${formData.date}T${formData.endTime}`);

            // Handle overnight shifts
            if (endsAt <= startsAt) {
                endsAt.setDate(endsAt.getDate() + 1);
            }

            // Get user name for shift title
            const selectedUser = users.find(u => u.id === formData.userId);
            const title = selectedUser?.name || 'Vakt';

            // Create shift
            const shiftRes = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    startsAt: startsAt.toISOString(),
                    endsAt: endsAt.toISOString(),
                    location: '-',
                    notes: formData.notes || null,
                    status: 'PLANNED',
                }),
            });

            if (!shiftRes.ok) {
                const data = await shiftRes.json();
                setFormError(data.error || 'Kunne ikke opprette vakt');
                setSubmitting(false);
                return;
            }

            const shift = await shiftRes.json();

            // Create assignment to link shift to user
            const assignRes = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shiftId: shift.id,
                    userId: formData.userId,
                }),
            });

            if (!assignRes.ok) {
                const assignData = await assignRes.json();
                console.error('Assignment failed:', assignData);
                // Still close modal since shift was created, but log the error
            }

            setShowModal(false);
            setFormData({ userId: '', date: '', startTime: '', endTime: '', notes: '' });
            fetchData();
        } catch {
            setFormError('En feil oppstod');
        }

        setSubmitting(false);
    };

    const deleteShift = async (id: string) => {
        if (!confirm('Er du sikker på at du vil slette denne vakten?')) return;

        try {
            await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete shift:', error);
        }
    };

    const cancelShift = async (id: string) => {
        try {
            await fetch(`/api/shifts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' }),
            });
            fetchData();
        } catch (error) {
            console.error('Failed to cancel shift:', error);
        }
    };

    return (
        <main className="main-content">
            <div className="page-header">
                <div>
                    <div className="breadcrumb">
                        <Link href="/admin">Admin</Link>
                        <span>/</span>
                        <span>Vakter</span>
                    </div>
                    <h1>📅 Vakter</h1>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + Ny vakt
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
                                <th>Dato</th>
                                <th>Tid</th>
                                <th>Ansatt</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map((shift) => (
                                <tr key={shift.id}>
                                    <td>{formatDate(shift.startsAt)}</td>
                                    <td>{formatTimeRange(shift.startsAt, shift.endsAt)}</td>
                                    <td>{shift.title}</td>
                                    <td>
                                        <span className={`badge badge-${shift.status.toLowerCase()}`}>
                                            {shift.status === 'PLANNED' ? 'Planlagt' : 'Avlyst'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex gap-sm justify-end">
                                            {shift.status !== 'CANCELLED' && (
                                                <button onClick={() => cancelShift(shift.id)} className="btn btn-ghost btn-sm">
                                                    Avlys
                                                </button>
                                            )}
                                            <button onClick={() => deleteShift(shift.id)} className="btn btn-ghost btn-sm">
                                                Slett
                                            </button>
                                        </div>
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
                            <h2 className="modal-title">Ny vakt</h2>
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
                                <label className="form-label">Velg ansatt *</label>
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="form-input form-select"
                                    required
                                >
                                    <option value="">Velg en ansatt...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dato *</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Start tid *</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Slutt tid *</label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notater</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="form-input"
                                    rows={3}
                                    placeholder="Valgfrie notater..."
                                />
                            </div>

                            <div className="flex gap-sm mt-lg">
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Oppretter...' : 'Opprett vakt'}
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

        .justify-end {
          justify-content: flex-end;
        }

        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }
      `}</style>
        </main>
    );
}
