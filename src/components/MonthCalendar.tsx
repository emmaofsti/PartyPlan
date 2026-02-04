'use client';

import { useState, useEffect } from 'react';
import DayDetailModal from './DayDetailModal';

interface ShiftAssignment {
    user: {
        id: string;
        name: string;
    };
}

interface CalendarShift {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    assignments: ShiftAssignment[];
    swapRequestsFrom?: { id: string; status: string; fromUserId: string; }[];
}

interface MonthCalendarProps {
    userId: string;
}

interface Birthday {
    name: string;
    birthday: string;
}

export default function MonthCalendar({ userId }: MonthCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState<CalendarShift[]>([]);
    const [birthdays, setBirthdays] = useState<Birthday[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetchMonthShifts();
    }, [currentDate]);

    useEffect(() => {
        fetchBirthdays();
    }, []);

    const fetchBirthdays = async () => {
        try {
            const res = await fetch('/api/users/birthdays');
            if (res.ok) {
                setBirthdays(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch birthdays:', error);
        }
    };

    const fetchMonthShifts = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // Get start and end of the grid (including padding days)
            const firstDayOfMonth = new Date(year, month, 1);
            const startDayOfWeek = firstDayOfMonth.getDay() || 7; // 1 (Mon) - 7 (Sun)

            // Start date for the query: Monday of the first week
            const startDate = new Date(firstDayOfMonth);
            startDate.setDate(1 - (startDayOfWeek - 1));
            startDate.setHours(0, 0, 0, 0);

            // End date: we typically show 6 weeks to be safe, or just enough to cover the month
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 42); // 6 weeks

            const res = await fetch(
                `/api/shifts/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
            );
            if (res.ok) {
                setShifts(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch calendar shifts:', error);
        }
        setLoading(false);
    };

    const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };

    const getWeeksInMonthGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Adjust for Monday start (0=Sun, 1=Mon... in JS Date, but we want 1=Mon, 7=Sun)
        let startDayOfWeek = firstDayOfMonth.getDay();
        if (startDayOfWeek === 0) startDayOfWeek = 7;

        const allDays = [];

        // Previous month padding
        for (let i = startDayOfWeek - 1; i > 0; i--) {
            const d = new Date(year, month, 1 - i);
            allDays.push({ date: d, isCurrentMonth: false });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            allDays.push({ date: d, isCurrentMonth: true });
        }

        // Next month padding to complete the last week
        const remainingCells = 7 - (allDays.length % 7);
        if (remainingCells < 7) {
            for (let i = 1; i <= remainingCells; i++) {
                const d = new Date(year, month + 1, i);
                allDays.push({ date: d, isCurrentMonth: false });
            }
        }

        // Chunk into weeks
        const weeks = [];
        for (let i = 0; i < allDays.length; i += 7) {
            const weekDays = allDays.slice(i, i + 7);
            // Use the first Thursday of the week to determine week number (ISO standard ish)
            // Or just use the first day + 3 days to get a day in the middle of the week
            if (weekDays.length > 0) {
                weeks.push({
                    weekNumber: getWeekNumber(weekDays[0].date),
                    days: weekDays
                });
            }
        }

        return weeks;
    };

    const hasMyShift = (date: Date) => {
        return shifts.some(s => {
            const shiftDate = new Date(s.startsAt);
            return shiftDate.getDate() === date.getDate() &&
                shiftDate.getMonth() === date.getMonth() &&
                shiftDate.getFullYear() === date.getFullYear() &&
                s.assignments.some(a => a.user.id === userId);
        });
    };

    const getShiftsForDate = (date: Date) => {
        return shifts.filter(s => {
            const shiftDate = new Date(s.startsAt);
            return shiftDate.getDate() === date.getDate() &&
                shiftDate.getMonth() === date.getMonth() &&
                shiftDate.getFullYear() === date.getFullYear();
        });
    };

    const getBirthdaysForDate = (date: Date) => {
        return birthdays.filter(b => {
            const bDate = new Date(b.birthday);
            return bDate.getDate() === date.getDate() &&
                bDate.getMonth() === date.getMonth();
        });
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const weekDays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
    const weeks = getWeeksInMonthGrid();

    return (
        <div className="month-calendar">
            <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} className="btn btn-ghost btn-sm">
                    ← Forrige
                </button>
                <h3 className="calendar-month-title">
                    {currentDate.toLocaleString('nb-NO', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => changeMonth(1)} className="btn btn-ghost btn-sm">
                    Neste →
                </button>
            </div>

            <div className="calendar-grid-header">
                <div className="calendar-week-label">Uke</div>
                {weekDays.map(day => (
                    <div key={day} className="calendar-weekday-label">{day}</div>
                ))}
            </div>

            {loading ? (
                <div className="calendar-loading">
                    <span className="loading-spinner" />
                </div>
            ) : (
                <div className="calendar-grid-month">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="calendar-week-row">
                            <div className="calendar-week-number">{week.weekNumber}</div>
                            {week.days.map((item, dIndex) => {
                                const isToday = new Date().toDateString() === item.date.toDateString();
                                const myShift = hasMyShift(item.date);
                                const dayShifts = getShiftsForDate(item.date);
                                const dayBirthdays = getBirthdaysForDate(item.date);
                                const hasPendingRequest = dayShifts.some(s =>
                                    s.swapRequestsFrom?.some(r => r.fromUserId === userId && r.status === 'PENDING')
                                );

                                return (
                                    <div
                                        key={dIndex}
                                        className={`
                                            calendar-day-cell
                                            ${!item.isCurrentMonth ? 'calendar-day-other-month' : ''}
                                            ${isToday ? 'calendar-day-today' : ''}
                                        `}
                                        onClick={() => setSelectedDate(item.date)}
                                    >
                                        <div className="day-number">{item.date.getDate()}</div>
                                        <div className="indicators">
                                            {myShift && <div className="shift-dot"></div>}
                                            {hasPendingRequest && <div className="pending-dot" title="Venter på svar"></div>}
                                            {dayBirthdays.length > 0 && (
                                                <div
                                                    className="birthday-dot"
                                                    title={`Bursdag: ${dayBirthdays.map(b => b.name).join(', ')}`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {selectedDate && (
                <DayDetailModal
                    date={selectedDate}
                    shifts={getShiftsForDate(selectedDate)}
                    currentUserId={userId}
                    onClose={() => setSelectedDate(null)}
                    birthdays={getBirthdaysForDate(selectedDate)}
                />
            )}

            <style jsx>{`
        .month-calendar {
          width: 100%;
          max-width: 100%;
        }

            .calendar-header {
                display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-lg);
        }

            .calendar-month-title {
                font - size: 1.25rem;
            font-weight: 600;
            color: var(--color-text-primary);
            text-transform: capitalize;
            margin: 0;
        }

            .calendar-grid-header {
                display: grid;
            grid-template-columns: 30px repeat(7, 1fr);
            gap: 2px;
            margin-bottom: var(--space-xs);
            text-align: center;
        }

            .calendar-week-label {
                font - size: 0.75rem;
            color: var(--color-text-muted);
            align-self: center;
        }

            .calendar-weekday-label {
                font - size: 0.875rem;
            color: var(--color-text-secondary);
            font-weight: 500;
            padding: var(--space-xs);
        }

            .calendar-grid-month {
                display: flex;
            flex-direction: column;
            gap: 2px;
        }

            .calendar-week-row {
                display: grid;
            grid-template-columns: 30px repeat(7, 1fr);
            gap: 2px;
        }

            .calendar-week-number {
                display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            color: var(--color-text-muted);
            font-weight: 500;
        }

            .calendar-day-cell {
                aspect - ratio: 1 / 1;
            width: 100%;
            background: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            cursor: pointer;
            position: relative;
            transition: background 0.2s;
            overflow: hidden;
            min-height: 0;
        }

            .calendar-day-cell:hover {
                background: var(--color-bg-secondary);
        }

            .calendar-day-other-month {
                opacity: 0.3;
        }

            .calendar-day-today {
                border - color: var(--color-brand-primary);
            box-shadow: 0 0 0 1px var(--color-brand-primary);
        }

            .day-number {
                font - size: 0.9rem;
            font-weight: 500;
            color: var(--color-text-primary);
        }

        .indicators {
            display: flex;
            gap: 4px;
            margin-top: 2px;
            height: 6px; /* Reserve height */
            align-items: center;
            justify-content: center;
        }

        .shift-dot {
            width: 6px;
            height: 6px;
            background-color: #ff6b8b; /* Pink */
            border-radius: 50%;
            flex-shrink: 0;
        }

        .pending-dot {
            width: 6px;
            height: 6px;
            background-color: #f59e0b; /* Amber/Orange */
            border-radius: 50%;
            flex-shrink: 0;
        }

        .birthday-dot {
            width: 6px;
            height: 6px;
            background-color: #fbbf24; /* Yellow/Gold */
            border-radius: 50%;
            flex-shrink: 0;
        }

            .calendar-loading {
                display: flex;
            justify-content: center;
            padding: var(--space-2xl);
        }
      `}</style>
        </div >
    );
}
