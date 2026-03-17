/** Returns true if any element of the providerNotifications array contains the substring. */
export function hasNotif(arr: string[] | undefined, sub: string): boolean {
    return !!arr?.some(s => s.includes(sub));
}

export function localDaysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
