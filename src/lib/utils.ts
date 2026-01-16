// Date formatting utilities for Europe/Oslo timezone

export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('nb-NO', {
        timeZone: 'Europe/Oslo',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

export function formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('nb-NO', {
        timeZone: 'Europe/Oslo',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateFull(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('nb-NO', {
        timeZone: 'Europe/Oslo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
    return `${formatTime(start)} – ${formatTime(end)}`;
}

export function isUpcoming(date: Date | string): boolean {
    return new Date(date) > new Date();
}

export function getRelativeDay(date: Date | string): string {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset times for comparison
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);

    if (d.getTime() === today.getTime()) {
        return 'I dag';
    }
    if (d.getTime() === tomorrow.getTime()) {
        return 'I morgen';
    }
    return formatDate(date);
}

// Status badge helpers
export function getStatusColor(status: string): string {
    switch (status) {
        case 'PLANNED':
            return 'var(--color-status-planned)';
        case 'CANCELLED':
            return 'var(--color-status-cancelled)';
        case 'CONFIRMED':
            return 'var(--color-status-confirmed)';
        case 'ASSIGNED':
            return 'var(--color-status-assigned)';
        case 'DECLINED':
            return 'var(--color-status-declined)';
        default:
            return 'var(--color-text-muted)';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case 'PLANNED':
            return 'Planlagt';
        case 'CANCELLED':
            return 'Avlyst';
        case 'CONFIRMED':
            return 'Bekreftet';
        case 'ASSIGNED':
            return 'Tildelt';
        case 'DECLINED':
            return 'Avslått';
        default:
            return status;
    }
}

// Validation helpers
export function validateShiftTimes(startsAt: Date, endsAt: Date): { valid: boolean; error?: string } {
    if (endsAt <= startsAt) {
        return { valid: false, error: 'Sluttid må være etter starttid' };
    }
    return { valid: true };
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
