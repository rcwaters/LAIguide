import type { RawMedJson, RawVariant, RawTier } from './types';
import { NO_PROVIDER_NOTIFICATION } from '../constants';

// ── DOM helpers ──────────────────────────────────────────────────────────────

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, string>,
    children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
        if (k === 'textContent') { e.textContent = v; continue; }
        e.setAttribute(k, v);
    }
    if (children) for (const c of children) e.append(c);
    return e;
}

export function makeSection(title: string, collapsed = false): { section: HTMLDivElement; body: HTMLDivElement } {
    const section = el('div', { class: `form-section${collapsed ? ' collapsed' : ''}` });
    const header = el('div', { class: 'form-section-header' }, [
        el('span', { class: 'chevron', textContent: '▼' }),
        document.createTextNode(title),
    ]);
    header.addEventListener('click', () => section.classList.toggle('collapsed'));
    const body = el('div', { class: 'form-section-body' });
    section.append(header, body);
    return { section, body };
}

export function makeTextInput(label: string, value: string, dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    row.append(el('input', { type: 'text', value, 'data-path': dataPath }));
    return row;
}

export function makeNumberInput(label: string, value: number | null, dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    row.append(el('input', { type: 'number', value: value != null ? String(value) : '', 'data-path': dataPath }));
    return row;
}

export function makeListEditor(label: string, items: string[], dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    const container = el('div', { class: 'list-editor', 'data-path': dataPath });

    function addItem(text: string) {
        const item = el('div', { class: 'list-item' });
        const ta = el('textarea');
        ta.value = text;
        const removeBtn = el('button', { class: 'remove-btn', type: 'button', textContent: '×' });
        removeBtn.addEventListener('click', () => item.remove());
        item.append(ta, removeBtn);
        container.insertBefore(item, addBtnEl);
    }

    const addBtnEl = el('button', { class: 'add-item-btn', type: 'button', textContent: '+ Add' });
    addBtnEl.addEventListener('click', () => addItem(''));
    container.append(addBtnEl);

    for (const t of items) addItem(t);
    row.append(container);
    return row;
}

// ── Form rendering ───────────────────────────────────────────────────────────

function renderTier(tier: RawTier, variantIdx: number, tierIdx: number): HTMLDivElement {
    const label = tier.maxDays != null ? `within ${tier.maxDays} days overdue` : 'beyond all time windows';
    const block = el('div', { class: 'tier-block' });
    const header = el('div', { class: 'tier-header' }, [
        el('span', { class: 'chevron', textContent: '▼' }),
        document.createTextNode(`Window ${tierIdx + 1}: ${label}`),
    ]);
    header.addEventListener('click', () => block.classList.toggle('collapsed'));
    const body = el('div', { class: 'tier-body' });

    const path = `guidance.late.variants.${variantIdx}.tiers.${tierIdx}`;
    body.append(makeNumberInput('Days Overdue Ceiling (blank = no limit)', tier.maxDays, `${path}.maxDays`));
    body.append(makeListEditor('Recommended Steps', tier.guidance?.idealSteps ?? [], `${path}.guidance.idealSteps`));
    body.append(makeListEditor('Acceptable Alternatives', tier.guidance?.pragmaticVariations ?? [], `${path}.guidance.pragmaticVariations`));
    const providerNotifs = tier.guidance?.providerNotifications ?? [];
    body.append(makeListEditor('When to Notify Provider', providerNotifs.length ? providerNotifs : [NO_PROVIDER_NOTIFICATION], `${path}.guidance.providerNotifications`));

    block.append(header, body);
    return block;
}

function renderVariant(variant: RawVariant, idx: number): HTMLDivElement {
    const block = el('div', { class: 'variant-block' });
    block.append(el('div', { class: 'variant-label', textContent: `Scenario: ${variant.key}` }));

    if (variant.sameAs) {
        block.append(el('div', { class: 'sameAs-note', textContent: `Uses the same guidance as "${variant.sameAs}"` }));
        return block;
    }

    const tiers = variant.tiers ?? [];
    for (let i = 0; i < tiers.length; i++) {
        block.append(renderTier(tiers[i], idx, i));
    }
    return block;
}

export function renderForm(container: HTMLDivElement, data: RawMedJson): void {
    container.innerHTML = '';

    // ── Medication Info ──
    const { section: basicSec, body: basicBody } = makeSection('Medication Info');
    basicBody.append(makeTextInput('Medication Name', data.displayName ?? '', 'displayName'));
    basicBody.append(makeTextInput('Internal Key', data.key ?? '', 'key'));
    basicBody.append(makeTextInput('Medication Group', data.optgroupLabel ?? '', 'optgroupLabel'));
    container.append(basicSec);

    // ── Provider Notifications — All Scenarios ──
    const { section: sharedSec, body: sharedBody } = makeSection('Provider Notifications — All Scenarios');
    sharedBody.append(
        makeListEditor('When to Notify Provider', data.guidance.shared?.providerNotifications ?? [], 'guidance.shared.providerNotifications'),
    );
    container.append(sharedSec);

    // ── Early Administration Window ──
    const early = data.guidance.early ?? {};
    const { section: earlySec, body: earlyBody } = makeSection('Early Administration Window');
    earlyBody.append(makeNumberInput('Minimum Days Since Last Dose', early.minDays ?? null, 'guidance.early.minDays'));
    if (early.daysBeforeDue != null) {
        earlyBody.append(makeNumberInput('Days Before Due Date Allowed', early.daysBeforeDue, 'guidance.early.daysBeforeDue'));
    }
    if (early.guidanceNote) {
        earlyBody.append(makeTextInput('Clinical Note', early.guidanceNote, 'guidance.early.guidanceNote'));
    }
    container.append(earlySec);

    // ── Overdue Guidance — Scenarios & Time Windows ──
    const variants = data.guidance.late?.variants ?? [];
    const { section: lateSec, body: lateBody } = makeSection('Overdue Guidance — Scenarios & Time Windows');
    for (let i = 0; i < variants.length; i++) {
        lateBody.append(renderVariant(variants[i], i));
    }
    container.append(lateSec);
}

// ── Form collection ──────────────────────────────────────────────────────────

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let target: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        // Handle array indices: e.g. guidance.late.variants.0.tiers.1
        if (/^\d+$/.test(parts[i + 1] ?? '')) {
            const arr = target[key] as Record<string, unknown>[];
            target = arr[Number(parts[i + 1])];
            i++;
        } else {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key] as Record<string, unknown>;
        }
    }
    target[parts[parts.length - 1]] = value;
}

export function collectFormData(
    formEditor: HTMLDivElement,
    currentMedData: Record<string, unknown>,
): Record<string, unknown> {
    const data = JSON.parse(JSON.stringify(currentMedData)) as Record<string, unknown>;

    formEditor.querySelectorAll<HTMLInputElement>('input[data-path]').forEach(input => {
        const val = input.type === 'number'
            ? (input.value === '' ? null : Number(input.value))
            : input.value;
        setNested(data, input.dataset.path!, val);
    });

    formEditor.querySelectorAll<HTMLDivElement>('.list-editor[data-path]').forEach(container => {
        const items: string[] = [];
        container.querySelectorAll<HTMLTextAreaElement>('.list-item textarea').forEach(ta => {
            if (ta.value.trim()) items.push(ta.value);
        });
        setNested(data, container.dataset.path!, items);
    });

    return data;
}
