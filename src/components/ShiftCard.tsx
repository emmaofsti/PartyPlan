'use client';

import { useState } from 'react';
import { formatDate, formatTimeRange, getRelativeDay, getStatusLabel } from '@/lib/utils';

interface ShiftCardProps {
    shift: {
        id: string;
        title: string;
        startsAt: string | Date;
        endsAt: string | Date;
        location: string;
        notes?: string | null;
        status: string;
        assignments?: { user: { id: string; name: string } }[];
    };
    assignmentStatus?: string;
    isNext?: boolean;
    pendingRequestType?: 'SWAP' | 'GIVE' | null;
    onCancelRequest?: () => void;
    showActions?: boolean;
    hasPendingSwap?: boolean;
    onConfirm?: () => void;
    onDecline?: () => void;
    onClick?: () => void;
}

export default function ShiftCard({
    shift,
    assignmentStatus,
    isNext = false,
    showActions = false,
    hasPendingSwap = false,
    pendingRequestType = null,
    onConfirm,
    onDecline,
    onCancelRequest,
    currentUserId,
    onClick,
}: ShiftCardProps & { currentUserId?: string }) {
    const isCancelled = shift.status === 'CANCELLED';

    // Helper text for pending status
    const getPendingLabel = () => {
        if (!pendingRequestType) return 'Bytte forespurt';
        return pendingRequestType === 'GIVE' ? 'Prøver å gi bort' : 'Prøver å bytte';
    };

    return (
        <div
            className={`card shift-card ${isNext ? 'next-shift' : ''} ${isCancelled ? 'cancelled' : ''} ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className="shift-card-header">
                <div className="header-left">
                    <div className="shift-date">{getRelativeDay(shift.startsAt)}</div>
                    <div className="shift-badges">
                        {hasPendingSwap && (
                            <span className="badge badge-warning">{getPendingLabel()}</span>
                        )}
                        {isCancelled && (
                            <span className="badge badge-cancelled">{getStatusLabel('CANCELLED')}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="shift-time">
                {formatTimeRange(shift.startsAt, shift.endsAt)}
            </div>

            {shift.notes && (
                <div className="shift-notes">{shift.notes}</div>
            )}

            {/* Actions for confirming/declining assignment */}
            {showActions && assignmentStatus === 'ASSIGNED' && !isCancelled && (
                <div className="shift-actions">
                    <button onClick={(e) => { e.stopPropagation(); onConfirm && onConfirm(); }} className="btn btn-primary btn-sm">
                        ✓ Bekreft
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDecline && onDecline(); }} className="btn btn-secondary btn-sm">
                        ✗ Avslå
                    </button>
                </div>
            )}

            {/* Cancel Pending Request Action */}
            {hasPendingSwap && onCancelRequest && (
                <div className="shift-actions">
                    <button onClick={(e) => { e.stopPropagation(); onCancelRequest(); }} className="btn btn-outline btn-sm w-full">
                        Avbryt forespørsel
                    </button>
                </div>
            )}

            <style jsx>{`
        .shift-card {
            transition: transform 0.2s, background-color 0.2s;
            position: relative;
        }
        .shift-card.cursor-pointer:hover {
            background-color: var(--color-bg-hover, #2a2a2a);
        }
        .shift-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .shift-badges {
          display: flex;
          gap: var(--space-xs);
        }

        .cancelled {
          opacity: 0.6;
        }

        .cancelled .shift-time,
        .cancelled .shift-title {
          text-decoration: line-through;
        }

        .shift-actions {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--color-border);
        }
      `}</style>
        </div>
    );
}
