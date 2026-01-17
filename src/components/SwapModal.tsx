import { useState } from 'react';
import { formatDate, formatTimeRange } from '@/lib/utils';

interface User {
    id: string;
    name: string;
}

interface Shift {
    id: string;
    title?: string;
    startsAt: Date;
    endsAt: Date;
    location?: string;
    status?: string;
    [key: string]: any; // Allow other props
}

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'swap' | 'give';
    currentShift: Shift;
    step: 'selectEmployee' | 'selectShift';
    setStep: (step: 'selectEmployee' | 'selectShift') => void;
    users: User[];
    selectedUser: User | null;
    userShifts: Shift[];
    loadingShifts: boolean;
    submitting: boolean;
    onSelectUser: (user: User) => void;
    onSelectShift: (shift: Shift) => void;
    onBack: () => void;
    checkUserAvailability: (userId: string) => boolean;
}

export default function SwapModal({
    isOpen,
    onClose,
    mode,
    currentShift,
    step,
    setStep,
    users,
    selectedUser,
    userShifts,
    loadingShifts,
    submitting,
    onSelectUser,
    onSelectShift,
    onBack,
    checkUserAvailability
}: SwapModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {step === 'selectEmployee'
                            ? (mode === 'swap' ? 'Velg ansatt å bytte med' : 'Gi bort vakt til')
                            : `${selectedUser?.name}s vakter`}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {step === 'selectEmployee' && (
                    <div className="employee-list">
                        {/* Option to give to ALL (only in 'give' mode) */}
                        {mode === 'give' && (
                            <button
                                onClick={() => onSelectUser({ id: 'ALL', name: 'Alle' })}
                                className="employee-item card"
                                disabled={submitting}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="employee-name">Alle</span>
                                    <span className="text-xs text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                        Send varsel til alle ansatte
                                    </span>
                                </div>
                                <span className="employee-arrow">→</span>
                            </button>
                        )}

                        {users.length === 0 ? (
                            <p className="text-muted">Ingen andre ansatte funnet</p>
                        ) : (
                            users.map((user) => {
                                const isBusy = checkUserAvailability(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => onSelectUser(user)}
                                        className="employee-item card"
                                        disabled={submitting}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="employee-name">{user.name}</span>
                                            {isBusy && (
                                                <span className="text-xs text-muted" style={{ fontSize: '0.75rem', marginTop: '2px', color: '#f78fa1' }}>
                                                    Har vakt denne dagen
                                                </span>
                                            )}
                                        </div>
                                        <span className="employee-arrow">→</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {step === 'selectShift' && (
                    <div className="shift-list">
                        <button
                            onClick={onBack}
                            className="btn btn-ghost btn-sm mb-md"
                        >
                            ← Tilbake
                        </button>

                        {loadingShifts ? (
                            <div className="text-center">
                                <span className="loading-spinner" />
                            </div>
                        ) : userShifts.length === 0 ? (
                            <p className="text-muted">Ingen kommende vakter for denne ansatte</p>
                        ) : (
                            userShifts.map((shift) => (
                                <button
                                    key={shift.id}
                                    onClick={() => onSelectShift(shift)}
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
            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; 
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .modal {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: var(--space-lg);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--color-border);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                }

                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-text-primary);
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    color: var(--color-text-muted);
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
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
                
                .employee-item:disabled {
                    opacity: 0.7;
                    cursor: default;
                }

                .employee-name {
                    font-weight: 500;
                    color: #ffffff;
                }
                
                .items-start {
                    align-items: flex-start;
                }
                
                .flex-col {
                    flex-direction: column;
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
        </div>
    );
}
