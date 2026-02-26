'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface User {
    id: string;
    name: string;
}

interface ShiftFromDB {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    assignments: { id: string; user: { id: string; name: string } }[];
}

// Cell data in the grid
interface CellData {
    userId: string | null;
    userName: string;
    shiftId: string | null; // null = new, string = existing from DB
    customStart?: string;   // Custom start time for Ekstra/Annet rows
    customEnd?: string;     // Custom end time for Ekstra/Annet rows
}

// Time slot definitions (matching the Excel screenshot)
const TIME_SLOTS = [
    { label: '10:00-17:00', start: '10:00', end: '17:00', isCustom: false },
    { label: '10:00-17:00', start: '10:00', end: '17:00', isCustom: false },
    { label: '12:00-19:00', start: '12:00', end: '19:00', isCustom: false },
    { label: '17:00-21:15', start: '17:00', end: '21:15', isCustom: false },
    { label: '17:00-21:15', start: '17:00', end: '21:15', isCustom: false },
    { label: 'Ekstra 1', start: '', end: '', isCustom: true },
    { label: 'Ekstra 2', start: '', end: '', isCustom: true },
    { label: 'Annet', start: '', end: '', isCustom: true },
];

const DAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

// Employee color palette
const EMPLOYEE_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
    '#4ade80', '#f87171', '#60a5fa', '#facc15', '#c084fc',
    '#fb923c', '#2dd4bf', '#f472b6', '#a3e635', '#94a3b8',
    '#e879f9', '#fbbf24', '#34d399', '#f97316', '#818cf8',
];

function getEmployeeColor(userId: string): string {
    if (!EMPLOYEE_COLORS[userId]) {
        const index = Object.keys(EMPLOYEE_COLORS).length % COLOR_PALETTE.length;
        EMPLOYEE_COLORS[userId] = COLOR_PALETTE[index];
    }
    return EMPLOYEE_COLORS[userId];
}

// Get ISO week number
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Get all weeks in a month (each week = array of dates Mon-Sat)
function getWeeksInMonth(year: number, month: number): Date[][] {
    const weeks: Date[][] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Find the Monday of the first week
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ...
    if (dayOfWeek === 0) {
        current.setDate(current.getDate() - 6);
    } else if (dayOfWeek !== 1) {
        current.setDate(current.getDate() - (dayOfWeek - 1));
    }

    while (current <= lastDay || current.getDay() !== 1) {
        const week: Date[] = [];
        for (let i = 0; i < 6; i++) { // Mon-Sat (6 days)
            week.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        // Skip Sunday
        if (current.getDay() === 0) {
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
        if (current > lastDay && current.getDay() === 1) break;
    }

    return weeks;
}

function formatDateShort(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateToKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MonthlyPage() {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Grid data: key = "date|slotIndex", value = CellData
    const [gridData, setGridData] = useState<Record<string, CellData>>({});
    // Track which cells were originally from DB (to detect changes)
    const [originalData, setOriginalData] = useState<Record<string, CellData>>({});
    // Which cell is currently being edited
    const [editingCell, setEditingCell] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = getWeeksInMonth(year, month);

    const monthName = currentDate.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate date range for the visible weeks
            const allDates = weeks.flat();
            const startDate = allDates[0];
            const endDate = allDates[allDates.length - 1];
            endDate.setHours(23, 59, 59);

            const [shiftsRes, usersRes] = await Promise.all([
                fetch(`/api/shifts/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`),
                fetch('/api/users'),
            ]);

            if (usersRes.ok) {
                const allUsers = await usersRes.json();
                setUsers(allUsers.filter((u: User & { name: string }) => u.name.toLowerCase() !== 'emma'));
            }

            if (shiftsRes.ok) {
                const shifts: ShiftFromDB[] = await shiftsRes.json();
                const newGridData: Record<string, CellData> = {};

                // Map existing shifts into the grid
                shifts.forEach((shift) => {
                    const shiftDate = new Date(shift.startsAt);
                    const dateKey = dateToKey(shiftDate);
                    const shiftStartHour = shiftDate.getHours();
                    const shiftStartMin = shiftDate.getMinutes();
                    const shiftEnd = new Date(shift.endsAt);
                    const shiftEndHour = shiftEnd.getHours();
                    const shiftEndMin = shiftEnd.getMinutes();

                    // Try to match to a time slot
                    let matchedSlot = -1;
                    for (let i = 0; i < TIME_SLOTS.length; i++) {
                        const [slotStartH, slotStartM] = TIME_SLOTS[i].start.split(':').map(Number);
                        const [slotEndH, slotEndM] = TIME_SLOTS[i].end.split(':').map(Number);

                        if (shiftStartHour === slotStartH && shiftStartMin === slotStartM &&
                            shiftEndHour === slotEndH && shiftEndMin === slotEndM) {
                            // Exact match – check if this slot is already taken for this date
                            const cellKey = `${dateKey}|${i}`;
                            if (!newGridData[cellKey]) {
                                matchedSlot = i;
                                break;
                            }
                        }
                    }

                    // If no exact match, put in first empty slot
                    if (matchedSlot === -1) {
                        for (let i = 0; i < TIME_SLOTS.length; i++) {
                            const cellKey = `${dateKey}|${i}`;
                            if (!newGridData[cellKey]) {
                                matchedSlot = i;
                                break;
                            }
                        }
                    }

                    if (matchedSlot === -1) return; // No room

                    const assigned = shift.assignments[0];
                    const cellKey = `${dateKey}|${matchedSlot}`;
                    newGridData[cellKey] = {
                        userId: assigned?.user.id || null,
                        userName: assigned?.user.name || shift.title,
                        shiftId: shift.id,
                    };
                });

                setGridData(newGridData);
                setOriginalData(JSON.parse(JSON.stringify(newGridData)));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
        setLoading(false);
    }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCellClick = (cellKey: string) => {
        setEditingCell(editingCell === cellKey ? null : cellKey);
    };

    const handleSelectUser = (cellKey: string, userId: string, userName: string) => {
        setGridData((prev) => ({
            ...prev,
            [cellKey]: {
                ...prev[cellKey],
                userId,
                userName,
                shiftId: prev[cellKey]?.shiftId || null,
            },
        }));
        setEditingCell(null);
    };

    const handleCustomTimeChange = (cellKey: string, field: 'customStart' | 'customEnd', value: string) => {
        setGridData((prev) => ({
            ...prev,
            [cellKey]: {
                ...prev[cellKey] || { userId: null, userName: '', shiftId: null },
                [field]: value,
            },
        }));
    };

    const handleRemoveUser = (cellKey: string) => {
        setGridData((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
        });
        setEditingCell(null);
    };

    const hasChanges = () => {
        const allKeys = new Set([...Object.keys(gridData), ...Object.keys(originalData)]);
        for (const key of allKeys) {
            const curr = gridData[key];
            const orig = originalData[key];
            if (!curr && orig) return true;
            if (curr && !orig) return true;
            if (curr && orig && (curr.userId !== orig.userId || curr.customStart !== orig.customStart || curr.customEnd !== orig.customEnd)) return true;
        }
        return false;
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);

        try {
            const allKeys = new Set([...Object.keys(gridData), ...Object.keys(originalData)]);

            // Find shifts to delete (were in original but removed or changed)
            const toDelete: string[] = [];
            // Find shifts to create (new or changed)
            const toCreate: { date: string; startTime: string; endTime: string; userId: string; userName: string }[] = [];

            for (const key of allKeys) {
                const curr = gridData[key];
                const orig = originalData[key];

                if (orig && !curr) {
                    // Removed
                    if (orig.shiftId) toDelete.push(orig.shiftId);
                } else if (curr && !orig) {
                    // New
                    if (curr.userId) {
                        const [date] = key.split('|');
                        const slotIdx = parseInt(key.split('|')[1]);
                        const slot = TIME_SLOTS[slotIdx];
                        const startTime = slot.isCustom ? (curr.customStart || '10:00') : slot.start;
                        const endTime = slot.isCustom ? (curr.customEnd || '17:00') : slot.end;
                        toCreate.push({
                            date,
                            startTime,
                            endTime,
                            userId: curr.userId,
                            userName: curr.userName,
                        });
                    }
                } else if (curr && orig && curr.userId !== orig.userId) {
                    // Changed: delete old, create new
                    if (orig.shiftId) toDelete.push(orig.shiftId);
                    if (curr.userId) {
                        const [date] = key.split('|');
                        const slotIdx = parseInt(key.split('|')[1]);
                        const slot = TIME_SLOTS[slotIdx];
                        const startTime = slot.isCustom ? (curr.customStart || '10:00') : slot.start;
                        const endTime = slot.isCustom ? (curr.customEnd || '17:00') : slot.end;
                        toCreate.push({
                            date,
                            startTime,
                            endTime,
                            userId: curr.userId,
                            userName: curr.userName,
                        });
                    }
                }
            }

            // Delete removed/changed shifts
            if (toDelete.length > 0) {
                await fetch('/api/shifts/bulk', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shiftIds: toDelete }),
                });
            }

            // Create new/changed shifts
            if (toCreate.length > 0) {
                await fetch('/api/shifts/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shifts: toCreate }),
                });
            }

            const totalChanges = toDelete.length + toCreate.length;
            setSaveMessage(`✅ Lagret ${totalChanges} endring${totalChanges !== 1 ? 'er' : ''}!`);

            // Reload to sync with DB
            await fetchData();

            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            console.error('Save error:', error);
            setSaveMessage('❌ Feil ved lagring');
        }
        setSaving(false);
    };

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    return (
        <main className="main-content monthly-page">
            <div className="monthly-header">
                <div>
                    <div className="breadcrumb">
                        <Link href="/admin">Admin</Link>
                        <span>/</span>
                        <span>Månedsplan</span>
                    </div>
                    <h1>📋 Månedsplan</h1>
                </div>
                <div className="monthly-controls">
                    <div className="month-nav">
                        <button onClick={prevMonth} className="btn btn-ghost btn-sm">← Forrige</button>
                        <span className="month-label">{monthName}</span>
                        <button onClick={nextMonth} className="btn btn-ghost btn-sm">Neste →</button>
                    </div>
                    {hasChanges() && (
                        <button
                            onClick={handleSave}
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Lagrer...' : '💾 Lagre endringer'}
                        </button>
                    )}
                    {saveMessage && <span className="save-msg">{saveMessage}</span>}
                </div>
            </div>

            {loading ? (
                <div className="text-center mt-lg">
                    <span className="loading-spinner" />
                </div>
            ) : (
                <div className="grid-wrapper">
                    {weeks.map((week, weekIdx) => {
                        const weekNum = getWeekNumber(week[0]);
                        return (
                            <div key={weekIdx} className="week-block">
                                <div className="week-header">Uke {weekNum}</div>
                                <div className="grid-table-scroll">
                                    <table className="grid-table">
                                        <thead>
                                            <tr>
                                                <th className="slot-header"></th>
                                                {week.map((date, dayIdx) => (
                                                    <th key={dayIdx} className={`day-header ${date.getMonth() !== month ? 'outside-month' : ''}`}>
                                                        <span className="day-name">{DAY_NAMES[dayIdx]}</span>
                                                        <span className="day-date">{formatDateShort(date)}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TIME_SLOTS.map((slot, slotIdx) => (
                                                <tr key={slotIdx} className={slot.label.startsWith('Ekstra') || slot.label === 'Annet' ? 'extra-row' : ''}>
                                                    <td className="slot-label">{slot.label}</td>
                                                    {week.map((date, dayIdx) => {
                                                        const cellKey = `${dateToKey(date)}|${slotIdx}`;
                                                        const cell = gridData[cellKey];
                                                        const isEditing = editingCell === cellKey;
                                                        const isOutside = date.getMonth() !== month;

                                                        return (
                                                            <td
                                                                key={dayIdx}
                                                                className={`grid-cell ${cell ? 'filled' : 'empty'} ${isOutside ? 'outside-month' : ''} ${isEditing ? 'editing' : ''}`}
                                                                style={cell?.userId ? { backgroundColor: getEmployeeColor(cell.userId) + '33', borderLeft: `3px solid ${getEmployeeColor(cell.userId)}` } : undefined}
                                                                onClick={() => handleCellClick(cellKey)}
                                                            >
                                                                {cell ? (
                                                                    <div className="cell-content">
                                                                        <span className="cell-name">{cell.userName}</span>
                                                                        {slot.isCustom && cell.customStart && (
                                                                            <span className="cell-time">{cell.customStart}-{cell.customEnd}</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="cell-placeholder">+</span>
                                                                )}

                                                                {isEditing && (
                                                                    <div className="cell-dropdown" onClick={(e) => e.stopPropagation()}>
                                                                        <div className="dropdown-title">{slot.label} – {DAY_NAMES[dayIdx]} {formatDateShort(date)}</div>
                                                                        {cell && (
                                                                            <button
                                                                                className="dropdown-item remove"
                                                                                onClick={() => handleRemoveUser(cellKey)}
                                                                            >
                                                                                ✕ Fjern {cell.userName}
                                                                            </button>
                                                                        )}
                                                                        {slot.isCustom && (
                                                                            <>
                                                                                <div className="dropdown-divider" />
                                                                                <div className="dropdown-time-inputs">
                                                                                    <label className="time-label">Tid:</label>
                                                                                    <input
                                                                                        type="time"
                                                                                        className="time-input"
                                                                                        value={gridData[cellKey]?.customStart || ''}
                                                                                        onChange={(e) => handleCustomTimeChange(cellKey, 'customStart', e.target.value)}
                                                                                        placeholder="Start"
                                                                                    />
                                                                                    <span className="time-sep">–</span>
                                                                                    <input
                                                                                        type="time"
                                                                                        className="time-input"
                                                                                        value={gridData[cellKey]?.customEnd || ''}
                                                                                        onChange={(e) => handleCustomTimeChange(cellKey, 'customEnd', e.target.value)}
                                                                                        placeholder="Slutt"
                                                                                    />
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        <div className="dropdown-divider" />
                                                                        {users.map((user) => (
                                                                            <button
                                                                                key={user.id}
                                                                                className={`dropdown-item ${cell?.userId === user.id ? 'active' : ''}`}
                                                                                onClick={() => handleSelectUser(cellKey, user.id, user.name)}
                                                                            >
                                                                                <span
                                                                                    className="color-dot"
                                                                                    style={{ backgroundColor: getEmployeeColor(user.id) }}
                                                                                />
                                                                                {user.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                .monthly-page {
                    max-width: 100%;
                    overflow-x: auto;
                }

                .monthly-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: var(--space-lg);
                    flex-wrap: wrap;
                    gap: var(--space-md);
                }

                .monthly-header h1 {
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

                .monthly-controls {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    flex-wrap: wrap;
                }

                .month-nav {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .month-label {
                    font-size: 1.125rem;
                    font-weight: 600;
                    text-transform: capitalize;
                    min-width: 160px;
                    text-align: center;
                }

                .save-msg {
                    font-size: 0.875rem;
                    font-weight: 500;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .grid-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                }

                .week-block {
                    background: var(--color-bg-card);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                }

                .week-header {
                    padding: var(--space-sm) var(--space-md);
                    font-weight: 700;
                    font-size: 0.9rem;
                    background: var(--color-bg-input);
                    border-bottom: 1px solid var(--color-border);
                    color: var(--color-text-primary);
                }

                .grid-table-scroll {
                    overflow-x: auto;
                }

                .grid-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.8rem;
                    min-width: 700px;
                }

                .grid-table th,
                .grid-table td {
                    border: 1px solid var(--color-border);
                    padding: 4px 6px;
                    text-align: center;
                    vertical-align: middle;
                }

                .slot-header {
                    width: 100px;
                    min-width: 100px;
                }

                .day-header {
                    min-width: 90px;
                }

                .day-header .day-name {
                    display: block;
                    font-size: 0.7rem;
                    text-transform: capitalize;
                    color: var(--color-text-muted);
                    font-weight: 500;
                }
                .day-header .day-date {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .slot-label {
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: var(--color-text-secondary);
                    white-space: nowrap;
                    text-align: left !important;
                    padding-left: 10px !important;
                    background: var(--color-bg-input);
                }

                .grid-cell {
                    cursor: pointer;
                    position: relative;
                    height: 36px;
                    transition: background-color 0.15s ease;
                    user-select: none;
                }

                .grid-cell:hover {
                    background-color: var(--color-bg-input) !important;
                }

                .grid-cell.filled {
                    font-weight: 600;
                }

                .grid-cell.outside-month {
                    opacity: 0.4;
                }

                .cell-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1px;
                    line-height: 1.1;
                }

                .cell-name {
                    font-size: 0.75rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 80px;
                    display: inline-block;
                }

                .cell-time {
                    font-size: 0.6rem;
                    color: var(--color-text-muted);
                    font-weight: 400;
                }

                .cell-placeholder {
                    color: var(--color-text-muted);
                    opacity: 0;
                    font-size: 1rem;
                }

                .grid-cell:hover .cell-placeholder {
                    opacity: 0.5;
                }

                .grid-cell.editing {
                    z-index: 100;
                }

                .cell-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    min-width: 180px;
                    z-index: 200;
                    padding: var(--space-xs);
                    max-height: 300px;
                    overflow-y: auto;
                }

                .dropdown-title {
                    padding: var(--space-xs) var(--space-sm);
                    font-size: 0.7rem;
                    color: var(--color-text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .dropdown-divider {
                    height: 1px;
                    background: var(--color-border);
                    margin: var(--space-xs) 0;
                }

                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    width: 100%;
                    padding: var(--space-xs) var(--space-sm);
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 0.825rem;
                    color: var(--color-text-primary);
                    border-radius: var(--radius-sm);
                    text-align: left;
                    white-space: nowrap;
                }

                .dropdown-item:hover {
                    background: var(--color-bg-input);
                }

                .dropdown-item.active {
                    background: var(--color-brand-primary);
                    color: white;
                }

                .dropdown-item.remove {
                    color: #ef4444;
                }

                .dropdown-item.remove:hover {
                    background: #fef2f2;
                }

                .color-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .extra-row .slot-label {
                    color: var(--color-text-muted);
                    font-style: italic;
                }

                .dropdown-time-inputs {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: var(--space-xs) var(--space-sm);
                }

                .time-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    flex-shrink: 0;
                }

                .time-input {
                    width: 70px;
                    padding: 3px 5px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-input);
                    color: var(--color-text-primary);
                    font-size: 0.75rem;
                    text-align: center;
                }

                .time-input:focus {
                    outline: none;
                    border-color: var(--color-brand-primary);
                }

                .time-sep {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                }
            `}</style>
        </main>
    );
}
