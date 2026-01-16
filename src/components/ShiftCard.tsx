'use client';

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
    };
    assignmentStatus?: string;
    isNext?: boolean;
    showActions?: boolean;
    hasPendingSwap?: boolean;
    onConfirm?: () => void;
    onDecline?: () => void;
}

export default function ShiftCard({
    shift,
    assignmentStatus,
    isNext = false,
    showActions = false,
    hasPendingSwap = false,
    onConfirm,
    onDecline,
}: ShiftCardProps) {
    const isCancelled = shift.status === 'CANCELLED';

    return (
        <div className={`card shift-card ${isNext ? 'next-shift' : ''} ${isCancelled ? 'cancelled' : ''}`}>
            <div className="shift-card-header">
                <div className="shift-date">{getRelativeDay(shift.startsAt)}</div>
                <div className="shift-badges">
                    {hasPendingSwap && (
                        <span className="badge badge-warning">Bytte forespurt</span>
                    )}
                    {isCancelled && (
                        <span className="badge badge-cancelled">{getStatusLabel('CANCELLED')}</span>
                    )}
                </div>
            </div>

            <div className="shift-time">
                {formatTimeRange(shift.startsAt, shift.endsAt)}
            </div>



            {shift.notes && (
                <div className="shift-notes">{shift.notes}</div>
            )}

            {showActions && assignmentStatus === 'ASSIGNED' && !isCancelled && (
                <div className="shift-actions">
                    <button onClick={onConfirm} className="btn btn-primary btn-sm">
                        ✓ Bekreft
                    </button>
                    <button onClick={onDecline} className="btn btn-secondary btn-sm">
                        ✗ Avslå
                    </button>
                </div>
            )}

            <style jsx>{`
        .shift-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
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
