import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    // Manual JST conversion: UTC timestamp + 9 hours
    const jstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));

    // Use getUTC* methods to extract JST values
    const year = jstDate.getUTCFullYear();
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();

    return `${year}年${month}月${day}日`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    // Manual JST conversion
    const jstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));

    const year = jstDate.getUTCFullYear();
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    const hour = String(jstDate.getUTCHours()).padStart(2, '0');
    const minute = String(jstDate.getUTCMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

export function formatTime(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    // Manual JST conversion
    const jstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));

    const hour = String(jstDate.getUTCHours()).padStart(2, '0');
    const minute = String(jstDate.getUTCMinutes()).padStart(2, '0');

    return `${hour}:${minute}`;
}


export function getJSTDateString(offsetDays: number = 0): string {
    // Get current time in JST
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (!year || !month || !day) return new Date().toISOString().split('T')[0];

    // Create a date object at midnight JST
    const jstDate = new Date(`${year}-${month}-${day}T00:00:00+09:00`);

    // Add offset
    jstDate.setDate(jstDate.getDate() + offsetDays);

    // Format back to YYYY-MM-DD
    const y = jstDate.getFullYear();
    const m = String(jstDate.getMonth() + 1).padStart(2, '0');
    const d = String(jstDate.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}
