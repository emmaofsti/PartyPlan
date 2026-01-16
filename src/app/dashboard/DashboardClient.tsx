'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftCard from '@/components/ShiftCard';
import WeekCalendar from '@/components/WeekCalendar';
import PushNotificationManager from '@/components/PushNotificationManager';
import { formatDate, formatTimeRange } from '@/lib/utils';

interface Shift {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string;
    notes: string | null;
    status: string;
    assignmentId: string;
    assignmentStatus: string;
}

interface User {
    id: string;
    name: string;
}

interface SwapRequest {
    id: string;
    status: string;
    fromUser: { id: string; name: string };
    toUser: { id: string; name: string };
    fromShift: Shift;
    toShift: Shift;
}

interface DashboardClientProps {
    shifts: Shift[];
    userName: string;
    userId: string;
}

export default function DashboardClient({ shifts, userName, userId }: DashboardClientProps) {
    const router = useRouter();
    const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'team'>('mine');

    // Swap flow state
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapStep, setSwapStep] = useState<'selectEmployee' | 'selectShift'>('selectEmployee');
    const [selectedMyShift, setSelectedMyShift] = useState<Shift | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUserShifts, setSelectedUserShifts] = useState<Shift[]>([]);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchSwapRequests();
    }, []);

    const fetchSwapRequests = async () => {
        try {
            const res = await fetch('/api/swap-requests');
            if (res.ok) {
                const data = await res.json();
                setSwapRequests(data);
            }
        } catch (error) {
            console.error('Failed to fetch swap requests:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                // Filter out current user and Emma (owner, not an employee)
                setUsers(data.filter((u: User) => u.id !== userId && u.name.toLowerCase() !== 'emma'));
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchUserShifts = async (targetUserId: string) => {
        setLoadingShifts(true);
        try {
            const res = await fetch(`/api/users/${targetUserId}/shifts`);
            if (res.ok) {
                const data = await res.json();
                setSelectedUserShifts(data);
            }
        } catch (error) {
            console.error('Failed to fetch user shifts:', error);
        }
        setLoadingShifts(false);
    };

    const openSwapModal = (shift: Shift) => {
        setSelectedMyShift(shift);
        setSwapStep('selectEmployee');
        setSelectedUser(null);
        setSelectedUserShifts([]);
        setShowSwapModal(true);
        fetchUsers();
    };

    const selectEmployee = (user: User) => {
        setSelectedUser(user);
        setSwapStep('selectShift');
        fetchUserShifts(user.id);
    };

    const requestSwap = async (theirShift: Shift) => {
        if (!selectedMyShift || !selectedUser) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/swap-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromShiftId: selectedMyShift.id,
                    toShiftId: theirShift.id,
                    toUserId: selectedUser.id,
                }),
            });

            if (res.ok) {
                setShowSwapModal(false);
                fetchSwapRequests();
                alert('Bytteforespørsel sendt!');
            } else {
                const data = await res.json();
                alert(data.error || 'Kunne ikke sende forespørsel');
            }
        } catch {
            alert('En feil oppstod');
        }
        setSubmitting(false);
    };

    const respondToSwap = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
        try {
            const res = await fetch(`/api/swap-requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                fetchSwapRequests();
                router.refresh();
                if (status === 'ACCEPTED') {
                    alert('Vaktbytte godkjent!');
                }
            }
        } catch (error) {
            console.error('Failed to respond to swap:', error);
        }
    };

    const upcomingShifts = shifts.filter((s) => s.status !== 'CANCELLED');
    const nextShift = upcomingShifts[0];
    const restShifts = upcomingShifts.slice(1);
    const pendingIncoming = swapRequests.filter(r => r.status === 'PENDING' && r.toUser.id === userId);

    return (
        <main className="main-content">
            <div className="dashboard-header">
                <h1 className="dashboard-greeting">Hei, {userName.split(' ')[0]}! 👋</h1>
                <p className="dashboard-subtitle">
                    {upcomingShifts.length > 0
                        ? `Du har ${upcomingShifts.length} kommende vakt${upcomingShifts.length > 1 ? 'er' : ''}`
                        : 'Ingen kommende vakter'}
                </p>
                <PushNotificationManager />
            </div>

            {/* View toggle */}
            <div className="view-toggle">
                <button
                    className={`view-toggle-btn ${viewMode === 'mine' ? 'active' : ''}`}
                    onClick={() => setViewMode('mine')}
                >
                    📋 Mine vakter
                </button>
                <button
                    className={`view-toggle-btn ${viewMode === 'team' ? 'active' : ''}`}
                    onClick={() => setViewMode('team')}
                >
                    👥 Felles vaktplan
                </button>
            </div>

            {/* Pending incoming swap requests */}
            {pendingIncoming.length > 0 && (
                <section className="dashboard-section">
                    <h2 className="section-title">📨 Bytteforespørsler</h2>
                    <div className="swap-requests">
                        {pendingIncoming.map((req) => (
                            <div key={req.id} className="card swap-request-card">
                                <p>
                                    <strong>{req.fromUser.name}</strong> vil bytte sin vakt
                                    <strong> {formatDate(req.fromShift.startsAt)} {formatTimeRange(req.fromShift.startsAt, req.fromShift.endsAt)}</strong> med din vakt
                                    <strong> {formatDate(req.toShift.startsAt)} {formatTimeRange(req.toShift.startsAt, req.toShift.endsAt)}</strong>
                                </p>
                                <div className="swap-actions">
                                    <button onClick={() => respondToSwap(req.id, 'ACCEPTED')} className="btn btn-primary btn-sm">
                                        ✓ Godta
                                    </button>
                                    <button onClick={() => respondToSwap(req.id, 'DECLINED')} className="btn btn-secondary btn-sm">
                                        ✗ Avslå
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Team Calendar View */}
            {viewMode === 'team' ? (
                <section className="dashboard-section">
                    <WeekCalendar userId={userId} />
                </section>
            ) : (
                /* Personal Shifts View */
                shifts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <p className="empty-state-text">Ingen kommende vakter</p>
                        <p className="text-muted text-sm">
                            Når du blir tildelt vakter, vil de vises her.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Next shift section */}
                        {nextShift && (
                            <section className="dashboard-section">
                                <h2 className="section-title">⭐ Neste vakt</h2>
                                <div className="next-shift-wrapper">
                                    <ShiftCard
                                        shift={nextShift}
                                        assignmentStatus={nextShift.assignmentStatus}
                                        isNext={true}
                                    />
                                    {nextShift.status !== 'CANCELLED' && (
                                        <button
                                            onClick={() => openSwapModal(nextShift)}
                                            className="btn btn-secondary btn-sm swap-btn"
                                        >
                                            🔄 Bytt vakt
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Upcoming shifts section */}
                        {restShifts.length > 0 && (
                            <section className="dashboard-section">
                                <h2 className="section-title">📋 Kommende vakter</h2>
                                <div className="shifts-grid">
                                    {restShifts.map((shift) => {
                                        const hasPendingSwap = swapRequests.some(
                                            req => req.fromShift.id === shift.id &&
                                                req.fromUser.id === userId &&
                                                req.status === 'PENDING'
                                        );

                                        return (
                                            <div key={shift.id} className="shift-wrapper">
                                                <ShiftCard
                                                    shift={shift}
                                                    assignmentStatus={shift.assignmentStatus}
                                                    isNext={false}
                                                    hasPendingSwap={hasPendingSwap}
                                                />
                                                {shift.status !== 'CANCELLED' && !hasPendingSwap && (
                                                    <button
                                                        onClick={() => openSwapModal(shift)}
                                                        className="btn btn-secondary btn-sm swap-btn"
                                                    >
                                                        🔄 Bytt vakt
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </>
                )
            )}

            {/* Swap Modal */}
            {showSwapModal && (
                <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {swapStep === 'selectEmployee' ? 'Velg ansatt å bytte med' : `${selectedUser?.name}s vakter`}
                            </h2>
                            <button className="modal-close" onClick={() => setShowSwapModal(false)}>✕</button>
                        </div>

                        {swapStep === 'selectEmployee' && (
                            <div className="employee-list">
                                {users.length === 0 ? (
                                    <p className="text-muted">Ingen andre ansatte funnet</p>
                                ) : (
                                    users.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => selectEmployee(user)}
                                            className="employee-item card"
                                        >
                                            <span className="employee-name">{user.name}</span>
                                            <span className="employee-arrow">→</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {swapStep === 'selectShift' && (
                            <div className="shift-list">
                                <button
                                    onClick={() => setSwapStep('selectEmployee')}
                                    className="btn btn-ghost btn-sm mb-md"
                                >
                                    ← Tilbake
                                </button>

                                {loadingShifts ? (
                                    <div className="text-center">
                                        <span className="loading-spinner" />
                                    </div>
                                ) : selectedUserShifts.length === 0 ? (
                                    <p className="text-muted">Ingen kommende vakter for denne ansatte</p>
                                ) : (
                                    selectedUserShifts.map((shift) => (
                                        <button
                                            key={shift.id}
                                            onClick={() => requestSwap(shift)}
                                            disabled={submitting}
                                            className="shift-item card"
                                        >
                                            <div className="shift-item-date">{formatDate(shift.startsAt)}</div>
                                            <div className="shift-item-time">{formatTimeRange(shift.startsAt, shift.endsAt)}</div>
                                            <span className="shift-item-action">Spør om bytte</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
        .dashboard-header {
          margin-bottom: var(--space-xl);
        }

        .dashboard-greeting {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .dashboard-subtitle {
          color: var(--color-text-secondary);
          margin-top: var(--space-sm);
        }

        .view-toggle {
          display: flex;
          gap: var(--space-xs);
          margin-bottom: var(--space-xl);
          background: var(--color-bg-secondary);
          padding: 4px;
          border-radius: var(--radius-lg);
          width: fit-content;
        }

        .view-toggle-btn {
          padding: var(--space-sm) var(--space-lg);
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-toggle-btn:hover {
          color: var(--color-text-primary);
        }

        .view-toggle-btn.active {
          background: var(--color-brand-primary);
          color: #000;
          font-weight: 600;
        }

        .dashboard-section {
          margin-bottom: var(--space-2xl);
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-md);
        }

        .next-shift-wrapper {
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .shifts-grid {
          display: grid;
          gap: var(--space-md);
        }

        @media (min-width: 768px) {
          .shifts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .shifts-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .shift-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .swap-btn {
          width: 100%;
        }

        .swap-requests {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .swap-request-card {
          background: linear-gradient(135deg, rgba(247, 143, 161, 0.1), rgba(249, 168, 182, 0.05));
          border-color: var(--color-brand-primary);
        }

        .swap-request-card p {
          margin: 0 0 var(--space-md) 0;
          line-height: 1.6;
        }

        .swap-actions {
          display: flex;
          gap: var(--space-sm);
        }

        .employee-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .employee-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          text-align: left;
          cursor: pointer;
          border: none;
          font-size: 1rem;
          color: #ffffff;
        }

        .employee-name {
          font-weight: 500;
          color: #ffffff;
        }

        .employee-arrow {
          color: var(--color-text-muted);
        }

        .shift-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .shift-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          width: 100%;
          text-align: left;
          cursor: pointer;
          border: none;
          font-size: 0.95rem;
          color: #ffffff;
        }

        .shift-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .shift-item-date {
          font-weight: 500;
          min-width: 100px;
          color: #ffffff;
        }

        .shift-item-time {
          color: #cccccc;
          flex: 1;
        }

        .shift-item-action {
          color: var(--color-brand-primary);
          font-weight: 500;
        }
      `}</style>
        </main>
    );
}
