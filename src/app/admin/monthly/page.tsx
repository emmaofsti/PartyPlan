'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    { label: '09:45-17:00', start: '09:45', end: '17:00', isCustom: false },
    { label: '09:45-17:00', start: '09:45', end: '17:00', isCustom: false },
    { label: '11:30-19:00', start: '11:30', end: '19:00', isCustom: false },
    { label: '17:00-21:15', start: '17:00', end: '21:15', isCustom: false },
    { label: '17:00-21:15', start: '17:00', end: '21:15', isCustom: false },
    { label: 'Ekstra 1', start: '', end: '', isCustom: true },
    { label: 'Ekstra 2', start: '', end: '', isCustom: true },
    { label: 'Annet', start: '', end: '', isCustom: true },
];

const DAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];

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

function getDateOfWeek(week: number, year: number): Date {
    // Returns the Monday of the given ISO week number
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1);
    monday.setDate(monday.getDate() + (week - 1) * 7);
    return monday;
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
        for (let i = 0; i < 7; i++) { // Mon-Sun (7 days)
            week.push(new Date(current));
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

    const [timeInputValue, setTimeInputValue] = useState('');

    // Grid data: key = "date|slotIndex", value = CellData
    const [gridData, setGridData] = useState<Record<string, CellData>>({});
    // Track which cells were originally from DB (to detect changes)
    const [originalData, setOriginalData] = useState<Record<string, CellData>>({});
    // Which cell is currently being edited
    const [editingCell, setEditingCell] = useState<string | null>(null);
    // Which week header is being edited (by weekIdx)
    const [editingWeekIdx, setEditingWeekIdx] = useState<number | null>(null);
    const [weekInputVal, setWeekInputVal] = useState('');
    const [targetWeekNum, setTargetWeekNum] = useState<number | null>(null);
    const hasScrolledToCurrentWeek = useRef(false);
    const initialLoadDone = useRef(false);
    const gridDataRef = useRef(gridData);
    const originalDataRef = useRef(originalData);
    // Keep refs in sync
    gridDataRef.current = gridData;
    originalDataRef.current = originalData;
    const [showFromWeek, setShowFromWeek] = useState<number | null>(null); // null = use currentWeekNum
    const [printWeeksByWeekNum, setPrintWeeksByWeekNum] = useState<Record<number, number>>({});
    // Position of the open dropdown (for fixed positioning)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
    // Refs for editing context
    const editingContextRef = useRef<{ dayIdx: number; date: Date; slotIdx: number; slot: typeof TIME_SLOTS[0] } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weeks = useMemo(() => getWeeksInMonth(year, month), [year, month]);
    const currentWeekNum = useMemo(() => getWeekNumber(new Date()), []);

    const monthName = currentDate.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });

    const fetchData = useCallback(async (silent = false) => {
        // PROTECTION: if silent mode and user has unsaved changes, only update users list
        if (silent && initialLoadDone.current) {
            const gd = gridDataRef.current;
            const od = originalDataRef.current;
            const allKeys = new Set([...Object.keys(gd), ...Object.keys(od)]);
            let hasPendingChanges = false;
            for (const key of allKeys) {
                const curr = gd[key];
                const orig = od[key];
                if (!curr && orig) { hasPendingChanges = true; break; }
                if (curr && !orig && curr.userId) { hasPendingChanges = true; break; }
                if (curr && orig) {
                    if (curr.userId !== orig.userId) { hasPendingChanges = true; break; }
                    if (curr.userId && (curr.customStart !== orig.customStart || curr.customEnd !== orig.customEnd)) { hasPendingChanges = true; break; }
                }
            }
            if (hasPendingChanges) {
                console.log('[Monthly] Skipping silent refresh: unsaved changes detected');
                // Still refresh user list
                try {
                    const usersRes = await fetch('/api/users');
                    if (usersRes.ok) {
                        const allUsers = await usersRes.json();
                        setUsers(allUsers.filter((u: User & { name: string }) => u.name.toLowerCase() !== 'emma'));
                    }
                } catch (e) { /* ignore */ }
                return gridDataRef.current;
            }
        }

        if (!silent) setLoading(true);
        try {
            // Calculate date range for the visible weeks
            const allDates = weeks.flat();
            if (allDates.length === 0) return null;

            const startDate = new Date(allDates[0]);
            const endDate = new Date(allDates[allDates.length - 1]);
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
                    const shiftStartMins = shiftStartHour * 60 + shiftStartMin;
                    const shiftEndMins = shiftEndHour * 60 + shiftEndMin;

                    // 1) Exact match (start + end)
                    for (let i = 0; i < TIME_SLOTS.length && matchedSlot === -1; i++) {
                        if (TIME_SLOTS[i].isCustom) continue;
                        const [sH, sM] = TIME_SLOTS[i].start.split(':').map(Number);
                        const [eH, eM] = TIME_SLOTS[i].end.split(':').map(Number);
                        if (shiftStartHour === sH && shiftStartMin === sM &&
                            shiftEndHour === eH && shiftEndMin === eM) {
                            const cellKey = `${dateKey}|${i}`;
                            if (!newGridData[cellKey]) matchedSlot = i;
                        }
                    }

                    // 2) Closest start time match (within 30 min), empty slot
                    if (matchedSlot === -1) {
                        let bestDiff = 31;
                        for (let i = 0; i < TIME_SLOTS.length; i++) {
                            if (TIME_SLOTS[i].isCustom) continue;
                            const [sH, sM] = TIME_SLOTS[i].start.split(':').map(Number);
                            const slotMins = sH * 60 + sM;
                            const diff = Math.abs(shiftStartMins - slotMins);
                            const cellKey = `${dateKey}|${i}`;
                            if (diff < bestDiff && !newGridData[cellKey]) {
                                bestDiff = diff;
                                matchedSlot = i;
                            }
                        }
                    }

                    // 3) Any empty slot
                    if (matchedSlot === -1) {
                        for (let i = 0; i < TIME_SLOTS.length; i++) {
                            const cellKey = `${dateKey}|${i}`;
                            if (!newGridData[cellKey]) { matchedSlot = i; break; }
                        }
                    }

                    if (matchedSlot === -1) return; // No room

                    const assigned = shift.assignments[0];
                    const cellKey = `${dateKey}|${matchedSlot}`;

                    const pad = (n: number) => String(n).padStart(2, '0');
                    const actualStart = `${pad(shiftStartHour)}:${pad(shiftStartMin)}`;
                    const actualEnd = `${pad(shiftEndHour)}:${pad(shiftEndMin)}`;
                    const slotStart = TIME_SLOTS[matchedSlot].start;
                    const slotEnd = TIME_SLOTS[matchedSlot].end;

                    const cellData: CellData = {
                        userId: assigned?.user.id || null,
                        userName: assigned?.user.name || shift.title,
                        shiftId: shift.id,
                    };
                    // Always store actual times so the cell displays what's really in the DB
                    if (actualStart !== slotStart || actualEnd !== slotEnd) {
                        cellData.customStart = actualStart;
                        cellData.customEnd = actualEnd;
                    }
                    newGridData[cellKey] = cellData;
                });

                setGridData(newGridData);
                setOriginalData(JSON.parse(JSON.stringify(newGridData)));
                initialLoadDone.current = true;
                return newGridData;
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
        return null;
    }, [year, month, weeks]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData();
        // Removed 60-second auto-refresh because it overwrites unsaved manual edits
    }, [fetchData]);

    const handleCellClick = (cellKey: string, e: React.MouseEvent, dayIdx: number, date: Date, slotIdx: number, slot: typeof TIME_SLOTS[0]) => {
        if (editingCell === cellKey) {
            setEditingCell(null);
            setDropdownPos(null);
            editingContextRef.current = null;
            return;
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const dropdownWidth = 220;
        let left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 8) {
            left = window.innerWidth - dropdownWidth - 8;
        }

        const currentData = gridData[cellKey];
        let currentStart = currentData?.customStart;
        let currentEnd = currentData?.customEnd;

        // SMART SUGGESTION: only set the INPUT display value, don't touch gridData
        if (!currentData?.userId && !currentStart && !currentEnd) {
            const dateStr = dateToKey(date);
            const registeredTimes = new Set<string>();
            Object.keys(gridData).forEach(k => {
                if (k.startsWith(dateStr) && gridData[k]?.userId) {
                    const idx = parseInt(k.split('|')[1]);
                    const cStart = gridData[k].customStart || (TIME_SLOTS[idx].isCustom ? '' : TIME_SLOTS[idx].start);
                    const cEnd = gridData[k].customEnd || (TIME_SLOTS[idx].isCustom ? '' : TIME_SLOTS[idx].end);
                    if (cStart && cEnd) registeredTimes.add(`${cStart}-${cEnd}`);
                }
            });

            const sequence = ['09:45-17:00', '09:45-17:00', '11:30-19:00', '17:00-21:15', '17:00-21:15'];
            // Count how many of each are registered
            const countMap: Record<string, number> = {};
            registeredTimes.forEach(t => { countMap[t] = (countMap[t] || 0) + 1; });
            // Count how many of each exist in sequence
            const seqCountMap: Record<string, number> = {};
            sequence.forEach(s => { seqCountMap[s] = (seqCountMap[s] || 0) + 1; });

            let suggestion: string | null = null;
            for (const seq of sequence) {
                const needed = seqCountMap[seq] || 0;
                const used = countMap[seq] || 0;
                if (used < needed) {
                    suggestion = seq;
                    // Mark as "used" so next iteration skips this slot
                    countMap[seq] = used + 1;
                    break;
                }
            }
            if (suggestion) {
                const [s, eTime] = suggestion.split('-');
                currentStart = s;
                currentEnd = eTime;
            } else {
                currentStart = slot.isCustom ? '' : slot.start;
                currentEnd = slot.isCustom ? '' : slot.end;
            }
        } else if (!currentData?.userId) {
            // Cell already has custom times typed (but no user yet) - keep them
        } else {
            if (!currentStart && !slot.isCustom) currentStart = slot.start;
            if (!currentEnd && !slot.isCustom) currentEnd = slot.end;
        }

        setTimeInputValue(currentStart && currentEnd ? `${currentStart} - ${currentEnd}` : '');

        setDropdownPos({ top: rect.bottom + 4, left });
        editingContextRef.current = { dayIdx, date, slotIdx, slot };
        setEditingCell(cellKey);
    };

    const handleSelectUser = (cellKey: string, userId: string, userName: string) => {
        // Parse the current time input so smart suggestions get saved with the shift
        const regex = /^(\d{1,2})[.:\s]?(\d{1,2})?\s*[-–]\s*(\d{1,2})[.:\s]?(\d{1,2})?$/;
        const match = timeInputValue.match(regex);
        let parsedStart: string | undefined;
        let parsedEnd: string | undefined;
        if (match) {
            let [_, h1, m1, h2, m2] = match;
            h1 = h1.padStart(2, '0');
            m1 = (m1 || '00').substring(0, 2).padStart(2, '0');
            h2 = h2.padStart(2, '0');
            m2 = (m2 || '00').substring(0, 2).padStart(2, '0');
            if (parseInt(h1) < 24 && parseInt(h2) < 24 && parseInt(m1) < 60 && parseInt(m2) < 60) {
                parsedStart = `${h1}:${m1}`;
                parsedEnd = `${h2}:${m2}`;
            }
        }

        setGridData((prev) => ({
            ...prev,
            [cellKey]: {
                ...prev[cellKey],
                userId,
                userName,
                shiftId: prev[cellKey]?.shiftId || null,
                ...(parsedStart && { customStart: parsedStart }),
                ...(parsedEnd && { customEnd: parsedEnd }),
            },
        }));
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

    useEffect(() => {
        const close = () => { setEditingCell(null); setDropdownPos(null); };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, []);

    const hasChanges = () => {
        const allKeys = new Set([...Object.keys(gridData), ...Object.keys(originalData)]);
        for (const key of allKeys) {
            const curr = gridData[key];
            const orig = originalData[key];
            
            if (!curr && orig) return true;
            if (curr && !orig) {
                if (curr.userId) return true;
            }
            if (curr && orig) {
                if (curr.userId !== orig.userId) return true;
                if (curr.userId && (curr.customStart !== orig.customStart || curr.customEnd !== orig.customEnd)) return true;
            }
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
            const toCreate: { startsAt: string; endsAt: string; userId: string; userName: string }[] = [];

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
                        const startTime = curr.customStart || slot.start || '10:00';
                        const endTime = curr.customEnd || slot.end || '17:00';
                        toCreate.push({
                            startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
                            endsAt: (() => {
                                const e = new Date(`${date}T${endTime}:00`);
                                const s = new Date(`${date}T${startTime}:00`);
                                if (e <= s) e.setDate(e.getDate() + 1);
                                return e.toISOString();
                            })(),
                            userId: curr.userId,
                            userName: curr.userName,
                        });
                    }
                } else if (curr && orig) {
                    const timeChanged = curr.customStart !== orig.customStart || curr.customEnd !== orig.customEnd;
                    const userChanged = curr.userId !== orig.userId;

                    if (userChanged || (timeChanged && curr.userId)) {
                        if (orig.shiftId) toDelete.push(orig.shiftId);
                        if (curr.userId) {
                            const [date] = key.split('|');
                            const slotIdx = parseInt(key.split('|')[1]);
                            const slot = TIME_SLOTS[slotIdx];
                            const startTime = curr.customStart || slot.start || '10:00';
                            const endTime = curr.customEnd || slot.end || '17:00';
                            toCreate.push({
                                startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
                                endsAt: (() => {
                                    const e = new Date(`${date}T${endTime}:00`);
                                    const s = new Date(`${date}T${startTime}:00`);
                                    if (e <= s) e.setDate(e.getDate() + 1);
                                    return e.toISOString();
                                })(),
                                userId: curr.userId,
                                userName: curr.userName,
                            });
                        }
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

            // Sync originalData to match gridData so hasChanges() is clean
            setOriginalData(JSON.parse(JSON.stringify(gridData)));

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

    // Show only current week and onwards by default; expand when user jumps to past week
    const minWeek = showFromWeek ?? currentWeekNum;
    const displayedWeeks = useMemo(() =>
        weeks.filter((w: Date[]) => getWeekNumber(w[0]) >= minWeek),
        [weeks, minWeek]);

    const jumpToWeek = (weekNum: number) => {
        const alreadyVisible = weeks.some(w => getWeekNumber(w[0]) === weekNum);
        if (!alreadyVisible) {
            const target = getDateOfWeek(weekNum, year);
            setCurrentDate(new Date(target.getFullYear(), target.getMonth(), 1));
        }
        // If jumping to a past week, adjust minWeek so it shows up
        if (weekNum < currentWeekNum) {
            setShowFromWeek(weekNum);
        } else {
            setShowFromWeek(null); // reset to current week
        }
        setEditingWeekIdx(null);
        setTargetWeekNum(weekNum);
    };

    useEffect(() => {
        if (targetWeekNum !== null) {
            const tryScroll = () => {
                const el = document.getElementById(`week-block-${targetWeekNum}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setTargetWeekNum(null);
                }
            };
            tryScroll();
            const t = setTimeout(tryScroll, 150);
            return () => clearTimeout(t);
        }
    }, [targetWeekNum, displayedWeeks]);

    const printWeeks = async (startWeekIdx: number, requestedWeekCount: number) => {
        const maxAvailableWeeks = Math.max(1, Math.min(2, displayedWeeks.length - startWeekIdx));
        const weekCount = Math.max(1, Math.min(maxAvailableWeeks, requestedWeekCount || 1));
        const weeksToPrint = displayedWeeks.slice(startWeekIdx, startWeekIdx + weekCount);
        if (weeksToPrint.length === 0) return;

        // Always fetch the latest data before printing (silent)
        const latestGridData = await fetchData(true) || gridData;

        const fmtDate = (d: Date) => d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
        const fmtShort = (d: Date) => d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });

        const buildWeekSection = (week: Date[]) => {
            const weekNum = getWeekNumber(week[0]);
            const firstDay = week[0];
            const lastDay = week[week.length - 1];
            const headerCols = week.map(d => `<th>${fmtDate(d)}</th>`).join('');

            const bodyRows = TIME_SLOTS.map((slot, slotIdx) => {
                const dateCols = week.map(date => {
                    const cellKey = `${dateToKey(date)}|${slotIdx}`;
                    const cell = latestGridData[cellKey];
                    const name = cell?.userName ?? '';
                    const time = slot.isCustom
                        ? (cell?.customStart && cell?.customEnd ? `${cell.customStart}–${cell.customEnd}` : '')
                        : slot.label;
                    return `<td>
                        ${name ? `<strong>${name}</strong>${time ? `<br/><small>${time}</small>` : ''}` : '<span class="empty">–</span>'}
                    </td>`;
                }).join('');
                return `<tr>${dateCols}</tr>`;
            }).join('');

            return `<section class="week-card">
  <h2>Uke ${weekNum}</h2>
  <p>${fmtShort(firstDay)} – ${fmtShort(lastDay)}</p>
  <table>
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</section>`;
        };

        const firstDay = weeksToPrint[0][0];
        const lastWeek = weeksToPrint[weeksToPrint.length - 1];
        const lastDay = lastWeek[lastWeek.length - 1];
        const allWeekSections = weeksToPrint.map(buildWeekSection).join('');

        const html = `<!DOCTYPE html>
<html lang="nb">
<head>
<meta charset="UTF-8">
<title>Vaktplan – ${weeksToPrint.length} uke${weeksToPrint.length === 1 ? '' : 'r'}</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; height: 100%; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  #range { margin: 0 0 6px; color: #555; font-size: 10px; }
  #print-sheet { width: 100%; height: 100%; overflow: hidden; }
  #print-content { transform-origin: top left; }
  .weeks-grid {
    display: grid;
    gap: 6px;
    align-items: start;
    grid-template-columns: 1fr;
  }
  .weeks-grid.count-2 {
    grid-template-columns: 1fr 1fr;
    height: calc(100vh - 44px);
    align-items: stretch;
  }
  .week-card {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 6px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .week-card h2 {
    margin: 0 0 2px;
    font-size: 12px;
  }
  .week-card p {
    margin: 0 0 5px;
    color: #666;
    font-size: 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #ddd;
    text-align: center;
    vertical-align: middle;
    padding: 2px 3px;
    font-size: 9px;
    line-height: 1.1;
    word-break: break-word;
  }
  th { background: #f5f5f5; font-weight: 600; }
  td small { color: #666; font-size: 8px; }
  .empty { color: #bbb; }
  .weeks-grid.count-2 .week-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }
  .weeks-grid.count-2 table {
    flex: 1;
    height: 100%;
  }
  .weeks-grid.count-2 tbody tr {
    height: 12.5%;
  }
  .weeks-grid.count-2 th, .weeks-grid.count-2 td { font-size: 8.5px; padding: 2px; }
  .weeks-grid.count-2 td small { font-size: 7.5px; }
  @media print { button { display: none; } }
</style>
</head>
<body>
  <div id="print-sheet">
    <div id="print-content">
      <h1>Vaktplan – ${weeksToPrint.length} uke${weeksToPrint.length === 1 ? '' : 'r'}</h1>
      <p id="range">${fmtShort(firstDay)} – ${fmtShort(lastDay)}</p>
      <div class="weeks-grid count-${weeksToPrint.length}">
        ${allWeekSections}
      </div>
    </div>
  </div>
  <script>
    (function () {
      const fitToOnePage = () => {
        const sheet = document.getElementById('print-sheet');
        const content = document.getElementById('print-content');
        if (!sheet || !content) return;
        content.style.transform = 'scale(1)';
        content.style.width = '100%';
        const rawScale = Math.min(
          sheet.clientWidth / content.scrollWidth,
          sheet.clientHeight / content.scrollHeight
        );
        const maxScale = ${weeksToPrint.length} === 2 ? 1.12 : 1;
        const scale = Math.min(maxScale, rawScale);
        if (Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.01) {
          content.style.transform = 'scale(' + scale + ')';
          content.style.width = (100 / scale) + '%';
        }
      };
      window.onload = function () {
        fitToOnePage();
        setTimeout(function () {
          fitToOnePage();
          window.print();
        }, 80);
      };
    })();
  <\/script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        }
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
                    {saving && <span className="save-msg">Lagrer...</span>}
                    {hasChanges() && (
                        <button
                            onClick={handleSave}
                            className="btn btn-secondary"
                            style={{ backgroundColor: '#22c55e', color: 'white', borderColor: '#16a34a' }}
                            disabled={saving}
                        >
                            Lagre endringer
                        </button>
                    )}
                    {saveMessage && !saving && <span className="save-msg">{saveMessage}</span>}
                </div>
            </div>

            {loading ? (
                <div className="text-center mt-lg">
                    <span className="loading-spinner" />
                </div>
            ) : (
                <div className="grid-wrapper">
                    {displayedWeeks.map((week: Date[], weekIdx: number) => {
                        const weekNum = getWeekNumber(week[0]);
                        const maxPrintWeeks = Math.max(1, Math.min(2, displayedWeeks.length - weekIdx));
                        const selectedPrintWeeks = Math.min(printWeeksByWeekNum[weekNum] ?? 1, maxPrintWeeks);
                        return (
                            <div key={weekIdx} id={`week-block-${weekNum}`} className={`week-block ${targetWeekNum === weekNum ? 'week-highlight' : ''}`}>
                                <div className="week-header">
                                    {editingWeekIdx === weekIdx ? (
                                        <input
                                            className="week-num-input"
                                            type="number"
                                            min={1}
                                            max={53}
                                            value={weekInputVal}
                                            autoFocus
                                            onChange={(e) => setWeekInputVal(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const n = parseInt(weekInputVal);
                                                    if (n >= 1 && n <= 53) jumpToWeek(n);
                                                } else if (e.key === 'Escape') {
                                                    setEditingWeekIdx(null);
                                                }
                                            }}
                                            onBlur={() => setEditingWeekIdx(null)}
                                        />
                                    ) : (
                                        <span
                                            className="week-num-label"
                                            title="Klikk for å hoppe til en annen uke"
                                            onClick={() => { setEditingWeekIdx(weekIdx); setWeekInputVal(String(weekNum)); }}
                                        >
                                            Uke {weekNum} ✎
                                        </span>
                                    )}
                                    <div className="print-controls">
                                        <select
                                            className="print-weeks-select"
                                            aria-label={`Velg antall uker for utskrift fra uke ${weekNum}`}
                                            value={selectedPrintWeeks}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value, 10);
                                                setPrintWeeksByWeekNum((prev) => ({ ...prev, [weekNum]: value }));
                                            }}
                                        >
                                            {Array.from({ length: maxPrintWeeks }, (_, i) => i + 1).map((count) => (
                                                <option key={count} value={count}>
                                                    {count} uke{count === 1 ? '' : 'r'}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className="print-week-btn"
                                            title={`Skriv ut ${selectedPrintWeeks} uke${selectedPrintWeeks === 1 ? '' : 'r'} fra uke ${weekNum}`}
                                            onClick={() => printWeeks(weekIdx, selectedPrintWeeks)}
                                        >🖨️ Skriv ut</button>
                                    </div>
                                </div>
                                <div className="grid-table-scroll">
                                    <table className="grid-table">
                                        <thead>
                                            <tr>
                                                {week.map((date: Date, dayIdx: number) => (
                                                    <th key={dayIdx} className={`day-header ${date.getMonth() !== month ? 'outside-month' : ''}`}>
                                                        <span className="day-name">{DAY_NAMES[dayIdx]}</span>
                                                        <span className="day-date">{formatDateShort(date)}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TIME_SLOTS.map((slot, slotIdx: number) => (
                                                <tr key={slotIdx} className={slot.label.startsWith('Ekstra') || slot.label === 'Annet' ? 'extra-row' : ''} title={slot.label}>

                                                    {week.map((date: Date, dayIdx: number) => {
                                                        const cellKey = `${dateToKey(date)}|${slotIdx}`;
                                                        const cell = gridData[cellKey];
                                                        const isEditing = editingCell === cellKey;
                                                        const isOutside = date.getMonth() !== month;

                                                        return (
                                                            <td
                                                                key={dayIdx}
                                                                className={`grid-cell ${cell ? 'filled' : 'empty'} ${isOutside ? 'outside-month' : ''} ${isEditing ? 'editing' : ''}`}
                                                                style={cell?.userId ? { backgroundColor: getEmployeeColor(cell.userId) + '33', borderLeft: `3px solid ${getEmployeeColor(cell.userId)}` } : undefined}
                                                                onClick={(e) => handleCellClick(cellKey, e, dayIdx, date, slotIdx, slot)}
                                                            >
                                                                {cell ? (
                                                                    <div className="cell-content">
                                                                        <span className="cell-name">{cell.userName}</span>
                                                                        {(cell.customStart || (!slot.isCustom && slot.start)) && (
                                                                            <span className="cell-time">
                                                                                {cell.customStart || slot.start}–{cell.customEnd || slot.end}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="cell-placeholder">+</span>
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

            {/* Global fixed dropdown – floats above everything */}
            {editingCell && dropdownPos && (() => {
                const closeDropdown = () => { setEditingCell(null); setDropdownPos(null); editingContextRef.current = null; };
                return (<div className="dropdown-overlay" onClick={closeDropdown} />);
            })()}
            {editingCell && dropdownPos && editingContextRef.current && (() => {
                const { dayIdx, date, slot } = editingContextRef.current;
                const cell = gridData[editingCell];
                return (
                    <div
                        className="cell-dropdown-fixed"
                        style={{ top: dropdownPos.top, left: dropdownPos.left }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dropdown-title">
                            <span className="dropdown-day">{DAY_NAMES[dayIdx]}</span>
                            <span className="dropdown-date">{formatDateShort(date)}</span>
                        </div>
                        {cell && (
                            <button className="dropdown-item remove" onClick={() => handleRemoveUser(editingCell)}>
                                ✕ Fjern {cell.userName}
                            </button>
                        )}
                        <div className="dropdown-divider" />
                        <div className="dropdown-time-inputs" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <label className="time-label" style={{ marginBottom: '4px' }}>Tid (f.eks 10-17):</label>
                            <input
                                autoFocus
                                type="text"
                                className="time-input"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="10.00 - 17.00"
                                value={timeInputValue}
                                onChange={(e) => {
                                    setTimeInputValue(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                }}
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    const regex = /^(\d{1,2})[.:\s]?(\d{1,2})?\s*[-–]\s*(\d{1,2})[.:\s]?(\d{1,2})?$/;
                                    const match = val.match(regex);
                                    if (match) {
                                        let [_, h1, m1, h2, m2] = match;
                                        h1 = h1.padStart(2, '0');
                                        m1 = (m1 || '00').substring(0, 2).padStart(2, '0');
                                        h2 = h2.padStart(2, '0');
                                        m2 = (m2 || '00').substring(0, 2).padStart(2, '0');
                                        
                                        if (parseInt(h1) < 24 && parseInt(h2) < 24 && parseInt(m1) < 60 && parseInt(m2) < 60) {
                                            handleCustomTimeChange(editingCell, 'customStart', `${h1}:${m1}`);
                                            handleCustomTimeChange(editingCell, 'customEnd', `${h2}:${m2}`);
                                            setTimeInputValue(`${h1}:${m1} - ${h2}:${m2}`);
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="dropdown-divider" />
                        {users.map((user) => (
                            <button
                                key={user.id}
                                className={`dropdown-item ${cell?.userId === user.id ? 'active' : ''}`}
                                onClick={() => handleSelectUser(editingCell, user.id, user.name)}
                            >
                                <span className="color-dot" style={{ backgroundColor: getEmployeeColor(user.id) }} />
                                {user.name}
                            </button>
                        ))}
                        <button
                            className="action-btn text-danger"
                            onClick={(e) => { e.stopPropagation(); handleRemoveUser(editingCell); }}
                        >
                            🗑️ Slett fra vakt
                        </button>
                    </div>
                );
            })()}



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

                .week-highlight {
                    border: 2px solid var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
                }

                .week-header {
                    padding: var(--space-sm) var(--space-md);
                    font-weight: 700;
                    font-size: 0.9rem;
                    background: var(--color-bg-input);
                    border-bottom: 1px solid var(--color-border);
                    color: var(--color-text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .week-num-label {
                    cursor: pointer;
                    border-radius: var(--radius-sm);
                    padding: 2px 6px;
                    transition: background 0.15s;
                    user-select: none;
                }

                .week-num-label:hover {
                    background: var(--color-primary-muted, rgba(99,102,241,0.12));
                    color: var(--color-primary);
                }

                .week-num-input {
                    width: 72px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border: 2px solid var(--color-primary);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-card);
                    color: var(--color-text-primary);
                    outline: none;
                }

                .print-week-btn {
                    background: none;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    font-size: 0.75rem;
                    padding: 3px 8px;
                    color: var(--color-text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: background 0.15s, color 0.15s;
                }

                .print-controls {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .print-weeks-select {
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    background: var(--color-bg-card);
                    color: var(--color-text-primary);
                    font-size: 0.75rem;
                    padding: 3px 6px;
                    height: 26px;
                }

                .print-week-btn:hover {
                    background: var(--color-brand-primary);
                    color: white;
                    border-color: transparent;
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
                    font-size: 0.7rem;
                    color: var(--color-text-secondary);
                    font-weight: 600;
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

                .dropdown-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                }

                .cell-dropdown-fixed {
                    position: fixed;
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 16px 48px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15);
                    min-width: 220px;
                    z-index: 9999;
                    padding: var(--space-sm);
                    max-height: 380px;
                    overflow-y: auto;
                }

                .dropdown-title {
                    padding: var(--space-xs) var(--space-sm) var(--space-xs);
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }

                .dropdown-day {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    text-transform: capitalize;
                }

                .dropdown-date {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
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
