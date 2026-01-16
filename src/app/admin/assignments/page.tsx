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
    status: string;
}

interface Assignment {
    id: string;
    shiftId: string;
    userId: string;
    assignmentStatus: string;
    shift: Shift;
    user: User;
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ shiftId: '', userId: '' });
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [assignmentsRes, usersRes, shiftsRes] = await Promise.all([
                fetch('/api/assignments'),
                fetch('/api/users'),
                fetch('/api/shifts?upcoming=true'),
            ]);

            if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (shiftsRes.ok) setShifts(await shiftsRes.json());
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
            const res = await fetch('/api/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                setFormData({ shiftId: '', userId: '' });
                fetchData();
            } else if (res.status === 409 && data.warning) {
                // Overlap warning - ask user to confirm
                if (confirm(`${data.error}\n\nVil du likevel tildele vakten?`)) {
                    // Force assignment by calling again (in real app, would need separate endpoint)
                    setFormError('Tildeling ikke fullført - overlapping oppdaget');
                }
            } else {
                setFormError(data.error || 'Kunne ikke opprette tildeling');
            }
        } catch {
            setFormError('En feil oppstod');
        }

        setSubmitting(false);
    };

    const deleteAssignment = async (id: string) => {
        if (!confirm('Er du sikker på at du vil fjerne denne tildelingen?')) return;

        try {
            await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete assignment:', error);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ASSIGNED': return 'Tildelt';
            case 'CONFIRMED': return 'Bekreftet';
            case 'DECLINED': return 'Avslått';
            default: return status;
        }
    };

    return (
        <main className="main-content">
            <div className="page-header">
                <div>
                    <div className="breadcrumb">
                        <Link href="/admin">Admin</Link>
                        <span>/</span>
                        <span>Tildelinger</span>
                    </div>
                    <h1>🔗 Tildelinger</h1>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + Ny tildeling
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
                                <th>Ansatt</th>
                                <th>Vakt</th>
                                <th>Dato</th>
                                <th>Tid</th>
                                <th>Lokasjon</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map((a) => (
                                <tr key={a.id}>
                                    <td>{a.user.name}</td>
                                    <td>{a.shift.title}</td>
                                    <td>{formatDate(a.shift.startsAt)}</td>
                                    <td>{formatTimeRange(a.shift.startsAt, a.shift.endsAt)}</td>
                                    <td>{a.shift.location}</td>
                                    <td>
                                        <span className={`badge badge-${a.assignmentStatus.toLowerCase()}`}>
                                            {getStatusLabel(a.assignmentStatus)}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button onClick={() => deleteAssignment(a.id)} className="btn btn-ghost btn-sm">
                                            Fjern
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
                            <h2 className="modal-title">Ny tildeling</h2>
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
                                <label className="form-label">Velg vakt *</label>
                                <select
                                    value={formData.shiftId}
                                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                                    className="form-input form-select"
                                    required
                                >
                                    <option value="">Velg en vakt...</option>
                                    {shifts
                                        .filter((s) => s.status !== 'CANCELLED')
                                        .map((shift) => (
                                            <option key={shift.id} value={shift.id}>
                                                {formatDate(shift.startsAt)} – {shift.title} ({shift.location})
                                            </option>
                                        ))}
                                </select>
                            </div>

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

                            <div className="flex gap-sm mt-lg">
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Oppretter...' : 'Opprett tildeling'}
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
      `}</style>
        </main>
    );
}
