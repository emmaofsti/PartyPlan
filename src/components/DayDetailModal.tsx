import { formatTimeRange } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface DayDetailModalProps {
    date: Date;
    onClose: () => void;
    currentUserId: string;
    shiftsPromise?: Promise<any[]>;
    shifts?: any[];
    birthdays?: { name: string; birthday: string }[];
}

export default function DayDetailModal({ date, onClose, currentUserId, shiftsPromise, shifts: initialShifts, birthdays }: DayDetailModalProps) {
    const [shifts, setShifts] = useState<any[]>(initialShifts || []);
    const [loading, setLoading] = useState(!initialShifts);

    useEffect(() => {
        if (initialShifts) {
            setShifts(initialShifts);
            setLoading(false);
            return;
        }
        if (shiftsPromise) {
            setLoading(true);
            shiftsPromise.then(data => {
                setShifts(data);
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [shiftsPromise, initialShifts]);

    const handleCancelRequest = async (requestId: string) => {
        if (!confirm('Er du sikker på at du vil trekke forespørselen?')) return;
        try {
            const res = await fetch(`/api/swap-requests/${requestId}`, { method: 'DELETE' });
            if (res.ok) {
                setShifts(prev => prev.map(s => ({
                    ...s,
                    swapRequestsFrom: s.swapRequestsFrom?.filter((r: any) => r.id !== requestId) || []
                })));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const formattedDate = date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });

    const userSlots = shifts.flatMap(shift =>
        (shift.assignments || []).map((assignment: any) => {
            const myPendingReq = shift.swapRequestsFrom?.find((r: any) => r.fromUserId === assignment.user.id);
            return {
                shiftId: shift.id,
                startsAt: shift.startsAt,
                endsAt: shift.endsAt,
                user: assignment.user,
                status: assignment.status,
                pendingReq: myPendingReq
            };
        })
    ).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{formattedDate}.</h2>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                <div className="modal-body">
                    {birthdays && birthdays.length > 0 && (
                        <div className="birthday-banner">
                            🎉 {birthdays.map(b => b.name).join(' og ')} har bursdag!
                        </div>
                    )}
                    {loading ? (
                        <div className="loading">Laster...</div>
                    ) : userSlots.length === 0 ? (
                        <div className="empty">Ingen vakter denne dagen</div>
                    ) : (
                        <div className="slots-list">
                            {userSlots.map((slot, i) => {
                                const isMe = slot.user.id === currentUserId;
                                return (
                                    <div key={`${slot.shiftId}-${slot.user.id}-${i}`} className={`slot-card ${isMe ? 'is-me' : ''}`}>
                                        <div className="slot-time">
                                            {formatTimeRange(slot.startsAt, slot.endsAt)}
                                        </div>
                                        <div className="slot-user">
                                            {isMe ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span className="me-badge">{slot.user?.name || 'Deg'}</span>
                                                    {slot.pendingReq && (
                                                        <div className="pending-req-container">
                                                            <span className="pending-label">
                                                                {slot.pendingReq.toShiftId ? 'Bytte forespurt' : 'Prøver å gi bort'}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCancelRequest(slot.pendingReq.id);
                                                                }}
                                                                className="btn-cancel-req"
                                                            >
                                                                Angre
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="user-name">{slot.user?.name || 'Ukjent'}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .pending-req-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 4px;
                }
                .pending-label {
                    font-size: 0.75rem;
                    color: #aaa;
                    font-style: italic;
                }
                .btn-cancel-req {
                    background: none;
                    border: none;
                    color: #ef4444;
                    font-size: 0.75rem;
                    text-decoration: underline;
                    cursor: pointer;
                    padding: 0;
                }
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                }
                
                .modal {
                    background: #141414;
                    border: 1px solid #333;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 400px;
                    color: #fff;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .modal-header {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    line-height: 1;
                }

                .btn-close:hover {
                    color: #fff;
                }
                
                .modal-body {
                    padding: 0 1.5rem 1.5rem 1.5rem;
                    max-height: 70vh;
                    overflow-y: auto;
                }
                
                .slots-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .slot-card {
                    background: #1f1f1f;
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    border-left: 4px solid transparent;
                }
                
                .slot-card.is-me {
                    background: #2a1f22;
                    border-left-color: #f78fa1;
                }
                
                .slot-time {
                    font-size: 0.85rem;
                    color: #888;
                }
                
                .slot-user {
                    font-size: 1rem;
                    font-weight: 500;
                }
                
                .me-badge {
                    background-color: #f78fa1;
                    color: #000;
                    padding: 0.25rem 0.75rem;
                    border-radius: 6px;
                    font-weight: 600;
                    display: inline-block;
                }
                
                .user-name {
                    color: #ccc;
                }
                
                .loading, .empty {
                    text-align: center;
                    color: #666;
                    padding: 2rem;
                }

                .birthday-banner {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    color: #000;
                    padding: 1rem;
                    border-radius: 12px;
                    margin-bottom: 1rem;
                    font-weight: 600;
                    text-align: center;
                    animation: popIn 0.3s ease-out;
                    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
                }
                
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
