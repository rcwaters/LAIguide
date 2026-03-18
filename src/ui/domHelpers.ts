export function el<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

export function show(id: string): void { el(id).style.display = 'block'; }
export function hide(id: string): void { el(id).style.display = 'none'; }

export function val(id: string): string {
    const elem = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (elem) return elem.value;
    return document.querySelector<HTMLInputElement>(`input[name="${id}"]:checked`)?.value ?? '';
}

export function clear(id: string): void {
    const elem = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (elem) { elem.value = ''; return; }
    document.querySelectorAll<HTMLInputElement>(`input[name="${id}"]`).forEach(r => { r.checked = false; });
}
