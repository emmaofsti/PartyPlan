'use client';

import { useState, useEffect } from 'react';
import { formatTimeRange } from '@/lib/utils';

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
}

interface WeekCalendarProps {
  userId: string;
}

export default function WeekCalendar({ userId }: WeekCalendarProps) {
  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday start

    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (offset * 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const { monday, sunday } = getWeekDates(weekOffset);

  useEffect(() => {
    fetchCalendarShifts();
  }, [weekOffset]);

  const fetchCalendarShifts = async () => {
    setLoading(true);
    try {
      const { monday, sunday } = getWeekDates(weekOffset);
      const res = await fetch(
        `/api/shifts/calendar?start=${monday.toISOString()}&end=${sunday.toISOString()}`
      );
      if (res.ok) {
        setShifts(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch calendar shifts:', error);
    }
    setLoading(false);
  };

  const weekDays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  const getDaysOfWeek = () => {
    const days = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getShiftsForDay = (date: Date) => {
    // Use local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return shifts.filter((s) => {
      const shiftDate = new Date(s.startsAt);
      return shiftDate.getFullYear() === year &&
        shiftDate.getMonth() === month &&
        shiftDate.getDate() === day;
    });
  };

  const formatDateHeader = (date: Date) => {
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const isUserShift = (shift: CalendarShift) => {
    return shift.assignments.some((a) => a.user.id === userId);
  };

  const days = getDaysOfWeek();

  return (
    <div className="week-calendar">
      <div className="calendar-header">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="btn btn-ghost btn-sm">
          ← Forrige
        </button>
        <h3 className="calendar-week-title">
          Uke {getWeekNumber(monday)}
        </h3>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="btn btn-ghost btn-sm">
          Neste →
        </button>
      </div>

      {loading ? (
        <div className="calendar-loading">
          <span className="loading-spinner" />
        </div>
      ) : (
        <div className="calendar-grid">
          {days.map((date, i) => {
            const dayShifts = getShiftsForDay(date);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div key={i} className={`calendar-day ${isToday ? 'calendar-day-today' : ''}`}>
                <div className="calendar-day-header">
                  <span className="calendar-day-name">{weekDays[i]}</span>
                  <span className="calendar-day-date">{formatDateHeader(date)}</span>
                </div>
                <div className="calendar-day-shifts">
                  {dayShifts.length === 0 ? (
                    <div className="calendar-no-shifts">Ingen vakter</div>
                  ) : (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`calendar-shift ${isUserShift(shift) ? 'calendar-shift-mine' : ''}`}
                      >
                        <div className="calendar-shift-time">
                          {formatTimeRange(shift.startsAt, shift.endsAt)}
                        </div>
                        <div className="calendar-shift-people">
                          {shift.assignments.map((a) => (
                            <span
                              key={a.user.id}
                              className={`calendar-person ${a.user.id === userId ? 'calendar-person-me' : ''}`}
                            >
                              {a.user.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .week-calendar {
          width: 100%;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-lg);
        }

        .calendar-week-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .calendar-loading {
          display: flex;
          justify-content: center;
          padding: var(--space-2xl);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--space-xs);
        }

        @media (max-width: 900px) {
          .calendar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .calendar-grid {
            grid-template-columns: 1fr;
          }
        }

        .calendar-day {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          min-height: 150px;
          overflow: hidden;
        }

        .calendar-day-today {
          border-color: var(--color-brand-primary);
          box-shadow: 0 0 0 1px var(--color-brand-primary);
        }

        .calendar-day-header {
          background: var(--color-bg-secondary);
          padding: var(--space-sm) var(--space-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
        }

        .calendar-day-name {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .calendar-day-date {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .calendar-day-shifts {
          padding: var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .calendar-no-shifts {
          color: var(--color-text-muted);
          font-size: 0.75rem;
          text-align: center;
          padding: var(--space-md);
        }

        .calendar-shift {
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          padding: var(--space-sm);
          border-left: 3px solid var(--color-border);
        }

        .calendar-shift-mine {
          border-left-color: var(--color-brand-primary);
          background: linear-gradient(135deg, rgba(247, 143, 161, 0.1), transparent);
        }

        .calendar-shift-time {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-xs);
        }

        .calendar-shift-people {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .calendar-person {
          font-size: 0.8rem;
          padding: 2px 6px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
        }

        .calendar-person-me {
          background: var(--color-brand-primary);
          color: #000;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
