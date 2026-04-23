
import { useState, useEffect } from 'react';

interface User {
    id: string;
    name: string;
}

interface AdminShiftModalProps {
    shift?: any; // Using any for simplicity with CalendarShift vs DB Shift types
    users: User[];
    onClose: () => void;
    onSave: (shiftData: any) => Promise<void>;
    onDelete: (shiftId: string) => Promise<void>;
    prefillDate?: Date;
}

export default function AdminShiftModal({ shift, users, onClose, onSave, onDelete, prefillDate }: AdminShiftModalProps) {
    const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const [date, setDate] = useState(shift ? formatLocalDate(new Date(shift.startsAt)) : prefillDate ? formatLocalDate(prefillDate) : formatLocalDate(new Date()));
    const [startTime, setStartTime] = useState(shift ? new Date(shift.startsAt).toTimeString().substring(0, 5) : '22:00');
    const [endTime, setEndTime] = useState(shift ? new Date(shift.endsAt).toTimeString().substring(0, 5) : '03:00');
    const [notes, setNotes] = useState(shift?.notes || '');
    const [selectedUserId, setSelectedUserId] = useState<string>(
        shift?.assignments?.[0]?.user?.id || ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const startsAt = new Date(`${date}T${startTime}:00`);
            const endsAt = new Date(`${date}T${endTime}:00`);

            // Handle next day end time
            if (endsAt < startsAt) {
                endsAt.setDate(endsAt.getDate() + 1);
            }

            const shiftData = {
                id: shift?.id,
                title: 'Vakt', // Default title as requested
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                location: 'Ausland', // Default location as requested
                notes,
                userId: selectedUserId || null
            };

            await onSave(shiftData);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('Er du sikker på at du vil slette denne vakten?')) {
            setIsSubmitting(true);
            try {
                await onDelete(shift.id);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <div className="modal-header">
                    <h2>{shift ? 'Rediger vakt' : 'Ny vakt'}</h2>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">

                    <div className="form-group">
                        <label>Velg ansatt *</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="input select-input"
                        >
                            <option value="">Velg en ansatt...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Dato *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Velg vakttype</label>
                        <div className="time-presets">
                            {[
                                { label: '09:45 – 17:00', start: '09:45', end: '17:00' },
                                { label: '11:30 – 19:00', start: '11:30', end: '19:00' },
                                { label: '17:00 – 21:15', start: '17:00', end: '21:15' },
                            ].map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    className={`time-preset-btn ${startTime === preset.start && endTime === preset.end ? 'active' : ''}`}
                                    onClick={() => { setStartTime(preset.start); setEndTime(preset.end); }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Start tid *</label>
                            <div className="time-input-wrapper">
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="input time-input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Slutt tid *</label>
                            <div className="time-input-wrapper">
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    className="input time-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notater</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input"
                            placeholder="Valgfrie notater..."
                            rows={4}
                        />
                    </div>

                    <div className="form-actions">
                        {shift ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="btn btn-danger"
                                disabled={isSubmitting}
                            >
                                Slett vakt
                            </button>
                        ) : (
                            <div /> /* Spacer */
                        )}
                        <div className="action-buttons-right">
                            {shift && (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Lagrer...' : 'Lagre endringer'}
                                </button>
                            )}
                            {!shift && (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Oppretter...' : 'Opprett vakt'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                                disabled={isSubmitting}
                            >
                                Avbryt
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <style jsx>{`
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
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 450px;
                    color: #fff;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    max-height: 90vh; /* Fallback for dvh */
                    max-height: 90dvh;
                    overflow: hidden; /* To clip content at border-radius */
                }
                
                .modal-header {
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #333;
                    flex-shrink: 0; /* Prevent header from shrinking */
                }
                
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #888;
                    padding: 0;
                    line-height: 1;
                }

                .btn-close:hover {
                    color: #fff;
                }
                
                .modal-body {
                    padding: 1.5rem; /* Adjusted padding */
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    overflow-y: auto;
                    flex: 1; /* Allow it to grow and shrink */
                    overscroll-behavior: contain; /* Prevent scrolling body behind */
                    padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); /* Account for safe area */
                }
                
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .form-row {
                    display: flex;
                    gap: 1rem;
                }
                
                .form-row .form-group {
                    flex: 1;
                }
                
                label {
                    color: #aaa;
                    font-size: 0.875rem;
                    font-weight: 400;
                }
                
                .input {
                    padding: 0.875rem;
                    background: #252525;
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: #fff;
                    font-size: 0.95rem;
                    width: 100%;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                .input:focus {
                    border-color: #555;
                }

                .select-input {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1em;
                }

                .time-input-wrapper {
                    position: relative;
                }
                
                /* Hide default dark mode calendar icon if possible or style it */
                ::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.6;
                    cursor: pointer;
                }

                textarea.input {
                    resize: vertical;
                    min-height: 100px;
                }
                
                .form-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: auto; /* Push to bottom if space allows */
                    padding-top: 1rem;
                }
                
                .time-presets {
                    display: flex;
                    gap: 0.5rem;
                }

                .time-preset-btn {
                    flex: 1;
                    padding: 0.7rem 0.5rem;
                    background: #252525;
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: #aaa;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }

                .time-preset-btn:hover {
                    border-color: #555;
                    color: #fff;
                }

                .time-preset-btn.active {
                    border-color: #f78fa1;
                    background: rgba(247, 143, 161, 0.15);
                    color: #f78fa1;
                    font-weight: 600;
                }

                .action-buttons-right {
                    display: flex;
                    gap: 0.75rem;
                    margin-left: auto;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    transition: opacity 0.2s;
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background-color: #f78fa1; /* Pink from image based on description or generic brand */
                    color: #000;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background-color: #f9a8b6;
                }
                
                .btn-secondary {
                    background-color: #333;
                    color: #fff;
                }
                
                .btn-secondary:hover:not(:disabled) {
                    background-color: #444;
                }

                .btn-danger {
                    background-color: transparent;
                    color: #ef4444;
                    padding: 0.75rem 0; 
                }
                
                .btn-danger:hover:not(:disabled) {
                    text-decoration: underline;
                }

                /* Mobile optimizations */
                @media (max-width: 500px) {
                    .modal-overlay {
                        align-items: flex-end;
                    }

                    .modal {
                        max-width: 100%;
                        border-radius: 16px 16px 0 0;
                        max-height: 85vh;
                        max-height: 85dvh;
                        border-bottom: none;
                    }

                    .modal-header {
                        padding: 1rem 1.25rem;
                    }

                    .modal-header h2 {
                        font-size: 1.1rem;
                    }

                    .modal-body {
                        padding: 1rem 1.25rem;
                        gap: 1rem;
                        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
                    }

                    .time-presets {
                        gap: 0.4rem;
                    }

                    .time-preset-btn {
                        padding: 0.65rem 0.25rem;
                        font-size: 0.8rem;
                        min-height: 44px;
                    }

                    .input {
                        padding: 0.75rem;
                        font-size: 0.9rem;
                        min-height: 44px;
                    }

                    textarea.input {
                        min-height: 70px;
                    }

                    .form-row {
                        gap: 0.75rem;
                    }

                    .btn {
                        padding: 0.7rem 1.25rem;
                        font-size: 0.9rem;
                        min-height: 44px;
                    }

                    .form-actions {
                        padding-top: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
