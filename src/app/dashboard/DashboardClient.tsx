'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ShiftCard from '@/components/ShiftCard';
import WeekCalendar from '@/components/WeekCalendar';
import MonthCalendar from '@/components/MonthCalendar';
import PushNotificationManager from '@/components/PushNotificationManager';
import AdminShiftModal from '@/components/AdminShiftModal';
import SwapModal from '@/components/SwapModal';
import DayDetailModal from '@/components/DayDetailModal';
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
    assignments?: { user: { id: string; name: string } }[]; // Optional as it comes from calendar API
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
    userRole: string;
}

export default function DashboardClient({ shifts, userName, userId, userRole }: DashboardClientProps) {
    const router = useRouter();
    const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'team' | 'month'>('mine');

    // Admin state
    const isAdmin = userRole === 'ADMIN';
    const [adminEditMode, setAdminEditMode] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminSelectedShift, setAdminSelectedShift] = useState<any | null>(null);

    // Swap flow state
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapMode, setSwapMode] = useState<'swap' | 'give'>('swap');
    const [swapStep, setSwapStep] = useState<'selectEmployee' | 'selectShift'>('selectEmployee');
    const [selectedMyShift, setSelectedMyShift] = useState<Shift | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUserShifts, setSelectedUserShifts] = useState<Shift[]>([]);
    const [shiftsOnSwapDate, setShiftsOnSwapDate] = useState<Shift[]>([]);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [dayModalData, setDayModalData] = useState<{ date: Date, promise: Promise<any[]> } | null>(null);
    const [showRequests, setShowRequests] = useState(true);

    useEffect(() => {
        fetchSwapRequests();
        if (isAdmin || showSwapModal) {
            fetchUsers(); // Fetch users if admin (for assignment) or swapping
        }
    }, [isAdmin, showSwapModal]);

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
                if (isAdmin) {
                    setUsers(data); // Admin needs everyone
                } else {
                    // All employees can see all other employees (excluding themselves)
                    setUsers(data.filter((u: User) => u.id !== userId));
                }
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

    const getShiftsOnDatePromise = (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return fetch(`/api/shifts/calendar?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            });
    };

    const fetchShiftsOnDate = async (date: Date) => {
        try {
            const data = await getShiftsOnDatePromise(date);
            setShiftsOnSwapDate(data);
        } catch (error) {
            console.error('Failed to fetch shifts on date:', error);
        }
    };

    const handleOpenDayModal = (date: Date) => {
        setDayModalData({
            date: new Date(date),
            promise: getShiftsOnDatePromise(date)
        });
    };

    const openSwapModal = (shift: Shift, mode: 'swap' | 'give') => {
        setSelectedMyShift(shift);
        setSwapMode(mode);
        setSwapStep('selectEmployee');
        setSelectedUser(null);
        setSelectedUserShifts([]);
        setShowSwapModal(true);
        fetchUsers();
        fetchShiftsOnDate(shift.startsAt);
    };

    const selectEmployee = async (user: User) => {
        setSelectedUser(user);

        if (swapMode === 'give') {
            if (!selectedMyShift) return;

            const isAll = user.id === 'ALL';
            if (!confirm(`Vil du gi bort vakten din til ${isAll ? 'alle' : user.name}?`)) return;

            setSubmitting(true);
            try {
                const res = await fetch('/api/swap-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fromShiftId: selectedMyShift.id,
                        toUserId: isAll ? null : user.id,
                    }),
                });

                if (res.ok) {
                    setShowSwapModal(false);
                    fetchSwapRequests();
                    alert(`Forespørsel om å gi bort vakt sendt til ${isAll ? 'alle' : user.name}!`);
                } else {
                    const data = await res.json();
                    alert(data.details || data.error || 'Kunne ikke sende forespørsel');
                }
            } catch {
                alert('En feil oppstod');
            }
            setSubmitting(false);
        } else {
            setSwapStep('selectShift');
            fetchUserShifts(user.id);
        }
    };

    const requestSwap = async (theirShift: any) => {
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

    const cancelSwapRequest = async (requestId: string) => {
        if (!confirm('Er du sikker på at du vil avbryte denne forespørselen?')) return;

        try {
            const res = await fetch(`/api/swap-requests/${requestId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchSwapRequests();
                alert('Forespørsel avbrutt');
            } else {
                const data = await res.json();
                alert(data.error || 'Kunne ikke avbryte forespørsel');
            }
        } catch (error) {
            console.error('Failed to cancel swap request:', error);
        }
    };

    const upcomingShifts = shifts.filter((s) => s.status !== 'CANCELLED');
    const nextShift = upcomingShifts[0];
    const restShifts = upcomingShifts.slice(1);

    const pendingIncoming = swapRequests.filter(r =>
        r.status === 'PENDING' &&
        (r.toUser?.id === userId || (!r.toUser && r.fromUser.id !== userId))
    );

    const checkUserAvailability = (currUserId: string) => {
        return shiftsOnSwapDate.some(shift =>
            shift.assignments && shift.assignments.some((a: any) => a.user.id === currUserId)
        );
    };

    const getPendingOutgoingRequest = (shiftId: string) => {
        return swapRequests.find(req =>
            req.fromShift.id === shiftId &&
            req.fromUser.id === userId &&
            req.status === 'PENDING'
        );
    };

    const handleAdminClickShift = (shift: any) => {
        setAdminSelectedShift(shift);
        setShowAdminModal(true);
    };

    const handleAdminAddShift = () => {
        setAdminSelectedShift(null); // New shift
        setShowAdminModal(true);
    };

    const handleSaveShift = async (shiftData: any) => {
        try {
            const isNew = !shiftData.id;
            const url = isNew ? '/api/shifts' : `/api/shifts/${shiftData.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shiftData),
            });

            if (res.ok) {
                setShowAdminModal(false);
                // Trigger refresh by updating refreshTrigger via showAdminModal state change
            } else {
                const err = await res.json();
                alert(err.error || 'Kunne ikke lagre vakt');
            }
        } catch (error) {
            console.error('Failed to save shift:', error);
            alert('En feil oppstod');
        }
    };

    const handleDeleteShift = async (shiftId: string) => {
        try {
            const res = await fetch(`/api/shifts/${shiftId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setShowAdminModal(false);
            } else {
                const err = await res.json();
                alert(err.error || 'Kunne ikke slette vakt');
            }
        } catch (error) {
            console.error('Failed to delete shift:', error);
            alert('En feil oppstod');
        }
    };

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
                <button
                    className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
                    onClick={() => setViewMode('month')}
                >
                    📅 Mnd oversikt
                </button>
            </div>

            {pendingIncoming.length > 0 && (
                <section className="dashboard-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 className="section-title" style={{ marginBottom: 0 }}>📨 Forespørsler</h2>
                        <button
                            onClick={() => setShowRequests(!showRequests)}
                            className="btn btn-ghost btn-sm"
                        >
                            {showRequests ? 'Skjul' : 'Vis'}
                        </button>
                    </div>
                    {showRequests && (
                        <div className="swap-requests">
                            {pendingIncoming.map((req) => (
                                <div key={req.id} className="card swap-request-card">
                                    <p>
                                        <strong>{req.fromUser.name}</strong>
                                        {req.toShift ? (
                                            <> vil bytte sin vakt <strong>{formatDate(req.fromShift.startsAt)} {formatTimeRange(req.fromShift.startsAt, req.fromShift.endsAt)}</strong> med din vakt <strong>{formatDate(req.toShift.startsAt)} {formatTimeRange(req.toShift.startsAt, req.toShift.endsAt)}</strong></>
                                        ) : (
                                            <> vil gi bort vakt <strong>{formatDate(req.fromShift.startsAt)} {formatTimeRange(req.fromShift.startsAt, req.fromShift.endsAt)}</strong>. Kan du jobbe?</>
                                        )}
                                    </p>
                                    <div className="swap-actions">
                                        <button onClick={() => {
                                            fetch(`/api/swap-requests/${req.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'ACCEPTED' })
                                            }).then(() => fetchSwapRequests());
                                        }} className="btn btn-primary btn-sm">
                                            ✓ Godta
                                        </button>
                                        {req.toUser && (
                                            <button onClick={() => {
                                                fetch(`/api/swap-requests/${req.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ status: 'DECLINED' })
                                                }).then(() => fetchSwapRequests());
                                            }} className="btn btn-secondary btn-sm">
                                                ✗ Avslå
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {viewMode === 'team' ? (
                <section className="dashboard-section">
                    <WeekCalendar
                        userId={userId}
                        isAdmin={isAdmin}
                        isEditing={adminEditMode}
                        onToggleEdit={() => setAdminEditMode(!adminEditMode)}
                        onShiftClick={handleAdminClickShift}
                        onAddShift={handleAdminAddShift}
                        refreshTrigger={showAdminModal ? 0 : 1}
                    />
                </section>
            ) : viewMode === 'month' ? (
                <section className="dashboard-section">
                    <MonthCalendar userId={userId} />
                </section>
            ) : (
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
                        {nextShift && (() => {
                            const pendingReq = getPendingOutgoingRequest(nextShift.id);
                            return (
                                <section className="dashboard-section">
                                    <h2 className="section-title">⭐ Neste vakt</h2>
                                    <div className="next-shift-wrapper">
                                        <ShiftCard
                                            shift={nextShift}
                                            assignmentStatus={nextShift.assignmentStatus}
                                            isNext
                                            hasPendingSwap={!!pendingReq}
                                            pendingRequestType={pendingReq?.fromUser.id === userId ? (pendingReq.toShift ? 'SWAP' : 'GIVE') : null}
                                            onCancelRequest={() => pendingReq && cancelSwapRequest(pendingReq.id)}
                                            currentUserId={userId}
                                            onClick={() => handleOpenDayModal(nextShift.startsAt)}
                                            onSwap={() => openSwapModal(nextShift, 'swap')}
                                            onGive={() => openSwapModal(nextShift, 'give')}
                                        />
                                    </div>
                                </section>
                            );
                        })()}

                        {restShifts.length > 0 && (
                            <div className="shifts-container">
                                <h2 className="section-title">Kommende vakter</h2>
                                <div className="shifts-grid">
                                    {restShifts.map((shift) => (
                                        <ShiftCard
                                            key={shift.id}
                                            shift={shift}
                                            assignmentStatus={shift.assignmentStatus}
                                            currentUserId={userId}
                                            onClick={() => handleOpenDayModal(shift.startsAt)}
                                            onSwap={() => openSwapModal(shift, 'swap')}
                                            onGive={() => openSwapModal(shift, 'give')}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )
            )}

            {showAdminModal && (
                <AdminShiftModal
                    shift={adminSelectedShift}
                    users={users}
                    onClose={() => setShowAdminModal(false)}
                    onSave={handleSaveShift}
                    onDelete={handleDeleteShift}
                />
            )}

            {showSwapModal && selectedMyShift && (
                <SwapModal
                    isOpen={showSwapModal}
                    onClose={() => setShowSwapModal(false)}
                    mode={swapMode}
                    currentShift={selectedMyShift}
                    step={swapStep}
                    setStep={setSwapStep}
                    users={users}
                    selectedUser={selectedUser}
                    userShifts={selectedUserShifts}
                    loadingShifts={loadingShifts}
                    submitting={submitting}
                    onSelectUser={selectEmployee}
                    onSelectShift={requestSwap}
                    onBack={() => setSwapStep('selectEmployee')}
                    checkUserAvailability={checkUserAvailability}
                />
            )}

            {dayModalData && (
                <DayDetailModal
                    date={dayModalData.date}
                    shiftsPromise={dayModalData.promise}
                    currentUserId={userId}
                    onClose={() => setDayModalData(null)}
                />
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
      `}</style>
        </main>
    );
}
