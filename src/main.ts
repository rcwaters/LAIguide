import './styles.css';
import { MED_REGISTRY } from './medLoader';
import type { MedicationKey, FormGroupSpec, FieldSpec } from './interfaces/med';
import type { SubmitContext, GuidanceResult, SupplementalGuidanceResult, CategoricalGuidanceResult } from './interfaces/guidance';
import { md, daysSinceDate, formatDate } from './utils';
import { NO_PROVIDER_NOTIFICATION, NO_SUPPLEMENTATION } from './constants';

// ─── Form Field Visibility ────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

function show(id: string): void { el(id).style.display = 'block'; }
function hide(id: string): void { el(id).style.display = 'none';  }
function val(id: string): string {
    const elem = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (elem) return elem.value;
    return document.querySelector<HTMLInputElement>(`input[name="${id}"]:checked`)?.value ?? '';
}
function clear(id: string): void {
    const elem = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (elem) { elem.value = ''; return; }
    document.querySelectorAll<HTMLInputElement>(`input[name="${id}"]`).forEach(r => { r.checked = false; });
}

export function handleGuidanceTypeChange(): void {
    const medication   = val('medication');
    const guidanceType = val('guidance-type');

    // Show/hide the guidance-type selector based on whether a medication is chosen
    const gtGroup = document.getElementById('guidance-type-group') as HTMLElement | null;
    if (gtGroup) gtGroup.style.display = medication ? 'block' : 'none';
    if (!medication) { clear('guidance-type'); }

    // Hide all late-guidance field groups (and any associated sub-field groups)
    Object.values(MED_REGISTRY).forEach(e => {
        hide(e.lateFieldsGroup);
        e.subFieldGroups?.forEach(hide);
    });

    Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).forEach(clear);

    // Show/hide the correct early date picker based on the med's earlyWindowType
    const earlyGroup     = document.getElementById('early-date-group')      as HTMLElement | null;
    const earlyLastGroup = document.getElementById('early-last-date-group') as HTMLElement | null;
    if (guidanceType === 'early' && medication) {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry?.earlyWindowType === 'since-last') {
            if (earlyGroup)     { earlyGroup.style.display     = 'none';  clear('next-injection-date'); }
            if (earlyLastGroup) { earlyLastGroup.style.display = 'block'; }
        } else {
            if (earlyGroup)     { earlyGroup.style.display     = 'block'; }
            if (earlyLastGroup) { earlyLastGroup.style.display = 'none';  clear('last-injection-date'); }
        }
    } else {
        if (earlyGroup)     { earlyGroup.style.display     = 'none';  clear('next-injection-date'); }
        if (earlyLastGroup) { earlyLastGroup.style.display = 'none';  clear('last-injection-date'); }
    }

    if (guidanceType === 'late') {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry) show(entry.lateFieldsGroup);
    }

    checkAutoSubmit();
}

export function handleInvegaTypeChange(): void {
    const entry = MED_REGISTRY[val('medication') as MedicationKey];
    if (!entry?.subGroupSelectorId) return;
    entry.handleSubGroupChange?.(val(entry.subGroupSelectorId), show, hide, clear);
    checkAutoSubmit();
}

// ─── Auto-submit ─────────────────────────────────────────────────────────────

export function checkAutoSubmit(): void {
    // If guidance is already displayed, don't re-submit
    if (document.querySelector('.guidance-section')) return;
    const medication   = val('medication');
    const guidanceType = val('guidance-type');
    if (!medication || !guidanceType) return;

    if (guidanceType === 'early') {
        const entry       = MED_REGISTRY[medication as MedicationKey];
        const dateField   = entry?.earlyWindowType === 'since-last' ? 'last-injection-date' : 'next-injection-date';
        if (!val(dateField)) return;
        handleSubmit();
        return;
    }

    // Late: every visible required field (date inputs + selects, excluding
    // the guidance-type segmented control) must have a value before submitting.
    const groups = document.querySelectorAll<HTMLElement>('.input-group[id]');
    for (const group of groups) {
        if (group.id === 'guidance-type-group') continue;
        if (group.style.display === 'none') continue;
        for (const input of group.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[type="date"], select')) {
            if (!input.value) return;
        }
    }
    handleSubmit();
}

// ─── Form Submit Handler ──────────────────────────────────────────────────────

export function handleSubmit(): void {
    try {
        const medication   = val('medication');
        const guidanceType = val('guidance-type');

        if (!medication)   { alert('Please select a medication.');    return; }
        if (!guidanceType) { alert('Please select a guidance type.'); return; }

        const ctx: SubmitContext = Object.fromEntries(
            Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).map(id => [id, val(id)])
        );

        if (guidanceType === 'early') {
            const entry = MED_REGISTRY[medication as MedicationKey];
            if (entry?.earlyWindowType === 'since-last') {
                if (!val('last-injection-date')) { alert('Please enter the date of the last injection.'); return; }
            } else {
                if (!val('next-injection-date')) { alert('Please enter the next scheduled injection date.'); return; }
            }
            showEarlyGuidance(medication);
            return;
        }

        const entry = MED_REGISTRY[medication as MedicationKey];
        if (!entry) { alert('Late/overdue guidance for this medication is coming soon!'); return; }

        const validationErr = entry.validateLate(ctx);
        if (validationErr) { alert(validationErr); return; }

        const params    = entry.buildLateParams(ctx);
        const guidance  = entry.getLateGuidance(params);
        const daysSince = params.daysSince!;

        const rows = infoRow('Medication:', entry.displayName)
                   + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + entry.buildLateInfoRows(ctx, daysSince).map(([label, value]) => infoRow(label, value)).join('');

        let body: string;
        if (entry.renderType === 'categorical') {
            body = categoricalBody(guidance as CategoricalGuidanceResult);
        } else if (entry.renderType === 'supplementation') {
            body = supplementationBody(guidance as SupplementalGuidanceResult);
        } else {
            body = threePartGuidance(guidance as GuidanceResult);
        }

        injectGuidanceSection(rows, body);
    } catch (err) {
        console.error('[handleSubmit] Unexpected error:', err);
    }
}

// ─── Guidance Rendering Helpers ───────────────────────────────────────────────

function infoRow(label: string, value: string): string {
    return `
        <div class="info-row">
            <span class="info-label">${label}</span>
            <span class="info-value">${value}</span>
        </div>`;
}

function threePartGuidance(guidance: GuidanceResult): string {
    const hasPragmatic = !!guidance.pragmaticVariations?.length;
    const idealTitle = hasPragmatic ? 'Ideal steps (if possible):' : 'Next steps:';
    const pragmaticBlock = hasPragmatic ? `
        <div class="guidance-content">
            <h3 class="guidance-heading">Acceptable pragmatic variations (if ideal is not possible):</h3>
            <div class="guidance-text">${guidance.pragmaticVariations!.map(v => md(v)).join('')}</div>
        </div>` : '';
    return `
        <div class="guidance-content">
            <h3 class="guidance-heading">${idealTitle}</h3>
            <div class="guidance-text">${md(guidance.idealSteps)}</div>
        </div>${pragmaticBlock}
        <div class="guidance-content">
            <h3 class="guidance-heading">When to notify provider:</h3>
            <div class="guidance-text">${md(guidance.providerNotification ?? NO_PROVIDER_NOTIFICATION)}</div>
        </div>`;
}

function injectGuidanceSection(infoRows: string, bodyHTML: string): void {
    document.querySelector<HTMLElement>('.form-section')!.style.display = 'none';

    const html = `
        <div class="guidance-section">
            <div class="medication-info">${infoRows}</div>
            ${bodyHTML}
            <div style="text-align: center; margin-top: 30px;">
                <button type="button" class="btn" onclick="startOver()">Start Over</button>
            </div>
        </div>`;

    document.querySelector('.disclaimer')!.insertAdjacentHTML('beforebegin', html);
    window.scrollTo(0, 0);
}

// ─── Guidance Display Functions ───────────────────────────────────────────────

function showEarlyGuidance(medication: string): void {
    const entry = MED_REGISTRY[medication as MedicationKey];

    let rows: string;
    let resultHTML: string;

    if (entry.earlyWindowType === 'since-last') {
        const lastDate  = val('last-injection-date');
        const daysSince = daysSinceDate(lastDate);
        const minDays   = entry.earlyMinDays!;

        rows = infoRow('Medication:', entry.displayName)
             + infoRow('Guidance Type:', 'Early Administration Guidance')
             + infoRow('Last injection:', formatDate(lastDate));

        if (daysSince >= minDays) {
            resultHTML = `<div class="guidance-content early-allowed">
                <strong>\u2705 Early administration is allowed.</strong>
                <p>It has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection (minimum: ${minDays} days).</p>
            </div>`;
        } else {
            const remaining = minDays - daysSince;
            resultHTML = `<div class="guidance-content early-not-allowed">
                <strong>\u274c Too early to administer.</strong>
                <p>It has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection. Early administration requires at least <strong>${minDays} days</strong> since the last injection (<strong>${remaining} day${remaining === 1 ? '' : 's'}</strong> remaining).</p>
            </div>`;
        }
    } else {
        const nextDate   = val('next-injection-date');
        const daysUntil  = Math.max(0, -daysSinceDate(nextDate));
        const windowDays = entry.earlyWindowDays!;

        rows = infoRow('Medication:', entry.displayName)
             + infoRow('Guidance Type:', 'Early Administration Guidance')
             + infoRow('Next injection scheduled:', formatDate(nextDate));

        if (daysUntil === 0) {
            resultHTML = `<div class="guidance-content early-allowed">
                <strong>\u2705 Administer today \u2014 the injection is scheduled for today.</strong>
            </div>`;
        } else if (daysUntil <= windowDays) {
            resultHTML = `<div class="guidance-content early-allowed">
                <strong>\u2705 Early administration is allowed.</strong>
                <p>The scheduled injection is <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong> away, within the ${windowDays}-day early window.</p>
            </div>`;
        } else {
            resultHTML = `<div class="guidance-content early-not-allowed">
                <strong>\u274c Too early to administer.</strong>
                <p>The scheduled injection is <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong> away. Early administration is permitted within <strong>${windowDays} day${windowDays === 1 ? '' : 's'}</strong> of the scheduled date.</p>
            </div>`;
        }
    }

    const body = `
        ${resultHTML}
        <div class="guidance-content">
            <h3 class="guidance-heading">Early administration window:</h3>
            <div class="guidance-text">${md(entry.earlyGuidance)}</div>
        </div>
        <div class="important-note">
            <strong>\u26a0\ufe0f Important:</strong> If there may be a reason to administer even earlier than the specified timeframe, provider approval must be obtained.
        </div>`;

    injectGuidanceSection(rows, body);
}

function categoricalBody(category: CategoricalGuidanceResult): string {
    const textMap: Record<CategoricalGuidanceResult, string> = {
        'early':   '<p>The Hafyera injection is not yet overdue. Please consult guidance on early dosing.</p>',
        'on-time': '<p>Proceed with administering the Hafyera injection. Plan for the subsequent injection in 6 months.</p>',
        'consult': `<p><strong>CONSULT PROVIDER REQUIRED</strong></p>
                    <p>The patient is presenting more than 6 months and 3 weeks after the last Hafyera dose.</p>
                    <p>Please consult a provider prior to proceeding with any injection.</p>`,
    };
    return `
        <div class="guidance-content">
            <h3 class="guidance-heading">Guidance:</h3>
            <div class="guidance-text">${textMap[category]}</div>
        </div>`;
}

function supplementationBody(guidance: SupplementalGuidanceResult): string {
    if (guidance.notDue) {
        return `<div class="guidance-content">
                    <h3 class="guidance-heading">Guidance:</h3>
                    <div class="guidance-text">${md(guidance.message)}</div>
                </div>`;
    }
    return `<div class="guidance-content">
                <h3 class="guidance-heading">Administer the usual Aristada dose as soon as possible, then assess the need for supplementation.</h3>
            </div>
            <div class="guidance-content">
                <h3 class="guidance-heading">Recommended supplementation:</h3>
                <div class="guidance-text">${md(guidance.supplementation ?? NO_SUPPLEMENTATION)}</div>
            </div>
            <div class="guidance-content">
                <h3 class="guidance-heading">When to notify provider:</h3>
                <div class="guidance-text">${md(guidance.providerNotification ?? NO_PROVIDER_NOTIFICATION)}</div>
            </div>`;
}
// ─── Form Initialisation ──────────────────────────────────────────────────────

function renderField(f: FieldSpec): string {
    const label = `<label for="${f.id}">${f.label} <span class="required">*</span></label>`;
    if (f.type === 'date') {
        const today = new Date().toISOString().split('T')[0];
        return `${label}\n<input type="date" id="${f.id}" class="date-input" max="${today}" onchange="checkAutoSubmit()">`;
    }
    const onchange = f.onchange ? ` onchange="${f.onchange}"` : ' onchange="checkAutoSubmit()"';
    const opts = f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('\n');
    return `${label}\n<select id="${f.id}"${onchange}>\n<option value="">${f.placeholder ?? 'Select...'}</option>\n${opts}\n</select>`;
}

function renderFieldGroup(spec: FormGroupSpec): string {
    const fields = spec.fields
        .map((f, i) => i === 0 ? renderField(f) : `<div style="margin-top: 15px;">${renderField(f)}</div>`)
        .join('\n');
    return `<div class="input-group" id="${spec.groupId}" style="display: none;">\n${fields}\n</div>`;
}

export function initForm(): void {
    try {
        const medSelect = document.getElementById('medication') as HTMLSelectElement | null;
        if (!medSelect) return; // guard for test environments
        // Guard against double-injection (Vite HMR re-executes the module but keeps the DOM)
        if (document.getElementById('uzedy-fields')) return;

        // Build the medication dropdown
        const groups = new Map<string, string[]>();
        for (const [key, entry] of Object.entries(MED_REGISTRY)) {
            if (!groups.has(entry.optgroupLabel)) groups.set(entry.optgroupLabel, []);
            groups.get(entry.optgroupLabel)!.push(`<option value="${key}">${entry.displayName}</option>`);
        }
        let optHtml = '<option value="">Select medication...</option>';
        for (const [groupLabel, opts] of groups) {
            optHtml += `<optgroup label="${groupLabel}">${opts.join('')}</optgroup>`;
        }
        medSelect.innerHTML = optHtml;

        // Inject all form field groups inside the form section
        const formSection = document.querySelector<HTMLElement>('.form-section')!;
        const groupsHtml = Object.values(MED_REGISTRY)
            .flatMap(e => e.formGroupsSpec)
            .map(renderFieldGroup)
            .join('\n');
        formSection.insertAdjacentHTML('beforeend', groupsHtml);

        // Inject the early-date-group (next scheduled date — for before-next meds)
        const today = new Date().toISOString().split('T')[0];
        formSection.insertAdjacentHTML('beforeend',
            `<div class="input-group" id="early-date-group" style="display: none;">
<label for="next-injection-date">Next injection scheduled <span class="required">*</span></label>
<input type="date" id="next-injection-date" class="date-input" min="${today}" onchange="checkAutoSubmit()">
</div>`);

        // Inject the early-last-date-group (last injection date — for since-last meds)
        formSection.insertAdjacentHTML('beforeend',
            `<div class="input-group" id="early-last-date-group" style="display: none;">
<label for="last-injection-date">Date of last injection <span class="required">*</span></label>
<input type="date" id="last-injection-date" class="date-input" max="${today}" onchange="checkAutoSubmit()">
</div>`);
    } catch (err) {
        console.error('[initForm] Unexpected error:', err);
    }
}

initForm();

// ─── Guidance type segmented control ─────────────────────────────────────────

export function selectGuidanceType(value: string): void {
    const input = document.getElementById('guidance-type') as HTMLInputElement | null;
    if (input) input.value = value;
    document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-value]').forEach(btn => {
        btn.classList.toggle('seg-btn--active', btn.dataset.value === value);
    });
    handleGuidanceTypeChange();
}

// ─── Start Over ───────────────────────────────────────────────────────────────

export function startOver(): void {
    try {
        ['medication', 'guidance-type', ...Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds)]
            .forEach(clear);

        Object.values(MED_REGISTRY).forEach(e => {
            hide(e.lateFieldsGroup);
            e.subFieldGroups?.forEach(hide);
        });

        const earlyDateGroup = document.getElementById('early-date-group')      as HTMLElement | null;
        const earlyLastGroup = document.getElementById('early-last-date-group') as HTMLElement | null;
        if (earlyDateGroup) { earlyDateGroup.style.display = 'none'; }
        if (earlyLastGroup) { earlyLastGroup.style.display = 'none'; }
        clear('next-injection-date');
        clear('last-injection-date');

        document.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(b => b.classList.remove('seg-btn--active'));
        const gtGroup = document.getElementById('guidance-type-group') as HTMLElement | null;
        if (gtGroup) gtGroup.style.display = 'none';

        document.querySelector('.guidance-section')?.remove();
        document.querySelector<HTMLElement>('.form-section')!.style.display = 'block';
        window.scrollTo(0, 0);
    } catch (err) {
        console.error('[startOver] Unexpected error:', err);
    }
}

// ─── Expose to HTML onclick handlers ─────────────────────────────────────────

declare global { interface Window {
    handleGuidanceTypeChange: typeof handleGuidanceTypeChange;
    handleInvegaTypeChange: typeof handleInvegaTypeChange;
    handleSubmit: typeof handleSubmit;
    checkAutoSubmit: typeof checkAutoSubmit;
    startOver: typeof startOver;
    selectGuidanceType: typeof selectGuidanceType;
} }

window.handleGuidanceTypeChange = handleGuidanceTypeChange;
window.handleInvegaTypeChange   = handleInvegaTypeChange;
window.handleSubmit             = handleSubmit;
window.checkAutoSubmit          = checkAutoSubmit;
window.startOver                = startOver;
window.selectGuidanceType       = selectGuidanceType;
