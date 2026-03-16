import './styles.css';
import { MED_REGISTRY } from './medLoader';
import type { MedicationKey, FormGroupSpec, FieldSpec } from './interfaces/med';
import type { SubmitContext, GuidanceResult } from './interfaces/guidance';
import { md, daysSinceDate, formatDate } from './utils';
import { NO_PROVIDER_NOTIFICATION } from './constants';

// ─── DOM ID constants ─────────────────────────────────────────────────────────

const NEXT_INJECTION_DATE_ID   = 'next-injection-date';
const LAST_INJECTION_DATE_ID   = 'last-injection-date';
const EARLY_DATE_GROUP_ID      = 'early-date-group';
const EARLY_LAST_DATE_GROUP_ID = 'early-last-date-group';
const MEDICATION_ID            = 'medication';
const GUIDANCE_TYPE_ID         = 'guidance-type';
const GUIDANCE_TYPE_GROUP_ID   = 'guidance-type-group';
const GUIDANCE_SECTION_SEL     = '.guidance-section';
const FORM_SECTION_SEL         = '.form-section';
const EARLY_GUIDANCE_LABEL     = 'Early Administration';
const LATE_GUIDANCE_LABEL      = 'Late/Overdue Administration';

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
    const medication   = val(MEDICATION_ID);
    const guidanceType = val(GUIDANCE_TYPE_ID);

    // Show/hide the guidance-type selector based on whether a medication is chosen
    const gtGroup = document.getElementById(GUIDANCE_TYPE_GROUP_ID) as HTMLElement | null;
    if (gtGroup) gtGroup.style.display = medication ? 'block' : 'none';
    if (!medication) { clear(GUIDANCE_TYPE_ID); }

    // Hide all late-guidance field groups (and any associated sub-field groups)
    Object.values(MED_REGISTRY).forEach(e => {
        hide(e.lateFieldsGroup);
        e.subFieldGroups?.forEach(hide);
    });

    Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).forEach(clear);

    // Show/hide the correct early date picker(s) based on which early fields are set
    const earlyGroup     = document.getElementById(EARLY_DATE_GROUP_ID)      as HTMLElement | null;
    const earlyLastGroup = document.getElementById(EARLY_LAST_DATE_GROUP_ID) as HTMLElement | null;
    if (guidanceType === 'early' && medication) {
        const entry            = MED_REGISTRY[medication as MedicationKey];
        if (entry?.earlyParamField) {
            // Variant-aware early guidance: reuse the late fields group (contains
            // the variant select + date field), hide the generic early date pickers.
            show(entry.lateFieldsGroup);
            if (earlyGroup)     { earlyGroup.style.display     = 'none';  clear(NEXT_INJECTION_DATE_ID); }
            if (earlyLastGroup) { earlyLastGroup.style.display = 'none';  clear(LAST_INJECTION_DATE_ID); }
        } else {
            const hasDaysBeforeDue = !!entry?.earlyDaysBeforeDue;
            const hasMinDays       = !!entry?.earlyMinDays;
            if (earlyGroup) {
                earlyGroup.style.display = hasDaysBeforeDue ? 'block' : 'none';
                if (!hasDaysBeforeDue) clear(NEXT_INJECTION_DATE_ID);
            }
            if (earlyLastGroup) {
                earlyLastGroup.style.display = hasMinDays ? 'block' : 'none';
                if (!hasMinDays) clear(LAST_INJECTION_DATE_ID);
            }
        }
    } else {
        if (earlyGroup)     { earlyGroup.style.display     = 'none';  clear(NEXT_INJECTION_DATE_ID); }
        if (earlyLastGroup) { earlyLastGroup.style.display = 'none';  clear(LAST_INJECTION_DATE_ID); }
    }

    if (guidanceType === 'late') {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry) show(entry.lateFieldsGroup);
    }

    checkAutoSubmit();
}

export function handleInvegaTypeChange(): void {
    const entry = MED_REGISTRY[val(MEDICATION_ID) as MedicationKey];
    if (!entry?.subGroupSelectorId) return;
    entry.handleSubGroupChange?.(val(entry.subGroupSelectorId), show, hide, clear);
    checkAutoSubmit();
}

// ─── Auto-submit ─────────────────────────────────────────────────────────────

export function checkAutoSubmit(): void {
    // If guidance is already displayed, don't re-submit
    if (document.querySelector(GUIDANCE_SECTION_SEL)) return;
    const medication   = val(MEDICATION_ID);
    const guidanceType = val(GUIDANCE_TYPE_ID);
    if (!medication || !guidanceType) return;

    if (guidanceType === 'early') {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry?.earlyParamField) {
            // Variant-aware: require variant selection; only require date for
            // variants that use minDays (not for no-guidance variants like weekly).
            const paramVal = val(entry.earlyParamField);
            if (!paramVal) return;
            const varDef = entry.earlyVariantMap?.[paramVal];
            if (!varDef?.noGuidanceMessage && entry.earlyDateField && !val(entry.earlyDateField)) return;
            handleSubmit();
            return;
        }
        if (entry?.earlyDaysBeforeDue && !val(NEXT_INJECTION_DATE_ID)) return;
        if (entry?.earlyMinDays       && !val(LAST_INJECTION_DATE_ID))  return;
        handleSubmit();
        return;
    }

    // Late: every visible required field (date inputs + selects, excluding
    // the guidance-type segmented control) must have a value before submitting.
    const groups = document.querySelectorAll<HTMLElement>('.input-group[id]');
    for (const group of groups) {
        if (group.id === GUIDANCE_TYPE_GROUP_ID) continue;
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
        const medication   = val(MEDICATION_ID);
        const guidanceType = val(GUIDANCE_TYPE_ID);

        if (!medication)   { alert('Please select a medication.');    return; }
        if (!guidanceType) { alert('Please select a guidance type.'); return; }

        const ctx: SubmitContext = Object.fromEntries(
            Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).map(id => [id, val(id)])
        );

        if (guidanceType === 'early') {
            const entry = MED_REGISTRY[medication as MedicationKey];
            if (entry?.earlyParamField) {
                const paramVal = val(entry.earlyParamField);
                if (!paramVal) { alert('Please select the formulation and dose.'); return; }
                const varDef = entry.earlyVariantMap?.[paramVal];
                if (!varDef?.noGuidanceMessage && entry.earlyDateField && !val(entry.earlyDateField)) {
                    alert('Please enter the date of the last injection.'); return;
                }
                showEarlyGuidance(medication, paramVal);
                return;
            }
            if (entry?.earlyDaysBeforeDue && !val(NEXT_INJECTION_DATE_ID)) { alert('Please enter the next scheduled injection date.'); return; }
            if (entry?.earlyMinDays       && !val(LAST_INJECTION_DATE_ID)) { alert('Please enter the date of the last injection.');        return; }
            showEarlyGuidance(medication);
            return;
        }

        const entry = MED_REGISTRY[medication as MedicationKey];
        if (!entry) { alert('Late/overdue guidance for this medication does not exist.'); return; }

        const validationErr = entry.validateLate(ctx);
        if (validationErr) { alert(validationErr); return; }

        const params    = entry.buildLateParams(ctx);
        const guidance  = entry.getLateGuidance(params);
        const daysSince = params.daysSince!;

        const rows = infoRow('Medication:', entry.displayName)
                   + infoRow('Guidance Type:', LATE_GUIDANCE_LABEL)
                   + entry.buildLateInfoRows(ctx, daysSince).map(([label, value]) => infoRow(label, value)).join('');

        const body = threePartGuidance(guidance as GuidanceResult, entry.commonProviderNotifications);

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

function threePartGuidance(guidance: GuidanceResult, common?: string[]): string {
    const hasPragmatic = !!guidance.pragmaticVariations?.length;
    const idealTitle = hasPragmatic ? 'Ideal steps:' : 'Next steps:';
    const pragmaticBlock = hasPragmatic ? `
        <div class="guidance-content">
            <h3 class="guidance-heading">Acceptable pragmatic variations (if ideal is not possible):</h3>
            <div class="guidance-text">${guidance.pragmaticVariations!.map(v => md(v)).join('')}</div>
        </div>` : '';
    const allNotifs = [...(guidance.providerNotifications ?? []), ...(common ?? [])];
    return `
        <div class="guidance-content">
            <h3 class="guidance-heading">${idealTitle}</h3>
            <div class="guidance-text">${md(guidance.idealSteps)}</div>
        </div>${pragmaticBlock}
        <div class="guidance-content">
            <h3 class="guidance-heading">When to notify provider:</h3>
            ${allNotifs.length
                ? `<ul>${allNotifs.map(n => `<li>${md(n)}</li>`).join('')}</ul>`
                : `<div class="guidance-text">${md(NO_PROVIDER_NOTIFICATION)}</div>`}
        </div>`;
}

function injectGuidanceSection(infoRows: string, bodyHTML: string): void {
    document.querySelector<HTMLElement>(FORM_SECTION_SEL)!.style.display = 'none';

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

function showEarlyGuidance(medication: string, variantKey?: string): void {
    const entry = MED_REGISTRY[medication as MedicationKey];

    // ── Variant-aware early guidance (e.g. Brixadi monthly vs. weekly) ────────
    if (variantKey != null && entry.earlyVariantMap) {
        const varDef = entry.earlyVariantMap[variantKey];

        // Resolve the human-readable label for the selected variant
        const allFields   = entry.formGroupsSpec.flatMap(g => g.fields);
        const selectField = allFields.find(f => f.type === 'select' && f.id === entry.earlyParamField);
        const selectedLabel = (selectField?.type === 'select')
            ? (selectField.options.find(o => o.value === variantKey)?.label ?? variantKey)
            : variantKey;

        const rows = infoRow('Medication:', entry.displayName)
                   + infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL)
                   + infoRow('Formulation:', selectedLabel);

        if (varDef?.noGuidanceMessage) {
            // No early dosing guidance for this variant (e.g. weekly)
            const body = `
                <div class="guidance-content early-not-allowed">
                    <p>ℹ️ ${varDef.noGuidanceMessage}</p>
                </div>`;
            injectGuidanceSection(rows, body);
            return;
        }

        // minDays variant (e.g. monthly-64/96/128)
        const lastDate  = val(entry.earlyDateField ?? LAST_INJECTION_DATE_ID);
        const daysSince = daysSinceDate(lastDate);
        const minDays   = varDef?.minDays ?? entry.earlyMinDays!;
        const rowsWithDate = rows + infoRow('Last injection:', formatDate(lastDate));

        let resultHTML: string;
        if (daysSince >= minDays) {
            resultHTML = `<div class="guidance-content early-allowed">
                <strong>✅ Early administration is allowed.</strong>
                <p>It has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection (minimum: ${minDays} days).</p>
            </div>`;
        } else {
            const remaining = minDays - daysSince;
            resultHTML = `<div class="guidance-content early-not-allowed">
                <strong>❌ Too early to administer.</strong>
                <p>It has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection. Early administration requires at least <strong>${minDays} days</strong> since the last injection (<strong>${remaining} day${remaining === 1 ? '' : 's'}</strong> remaining).</p>
            </div>`;
        }

        const body = `
            ${resultHTML}
            <div class="guidance-content">
                <h3 class="guidance-heading">Early administration window:</h3>
                <div class="guidance-text">${md(entry.earlyGuidance)}</div>
            </div>
            ${(() => {
                const combined = [...(entry.earlyProviderNotification ?? []), ...(entry.commonProviderNotifications ?? [])];
                return combined.length
                    ? `<div class="guidance-content">
                    <h3 class="guidance-heading">When to notify provider:</h3>
                    <ul>${combined.map(n => `<li>${md(n)}</li>`).join('')}</ul>
                </div>`
                    : '';
            })()}
            <div class="important-note">
                <strong>⚠️ Important:</strong> If there may be a reason to administer even earlier than the specified timeframe, provider approval must be obtained.
            </div>`;

        injectGuidanceSection(rowsWithDate, body);
        return;
    }

    // ── Standard (non-variant) early guidance ─────────────────────────────────
    const hasDaysBeforeDue = !!entry.earlyDaysBeforeDue;
    const hasMinDays       = !!entry.earlyMinDays;

    let rows: string;
    let resultHTML: string;

    if (hasDaysBeforeDue && hasMinDays) {
        // Dual constraint: within X days of due date AND at least Y days since last injection
        const nextDate   = val(NEXT_INJECTION_DATE_ID);
        const lastDate   = val(LAST_INJECTION_DATE_ID);
        const daysUntil  = Math.max(0, -daysSinceDate(nextDate));
        const daysSince  = daysSinceDate(lastDate);
        const windowDays = entry.earlyDaysBeforeDue!;
        const minDays    = entry.earlyMinDays!;

        rows = infoRow('Medication:', entry.displayName)
             + infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL)
             + infoRow('Next injection scheduled:', formatDate(nextDate))
             + infoRow('Last injection:', formatDate(lastDate));

        const withinWindow = daysUntil === 0 || daysUntil <= windowDays;
        const pastMinimum  = daysSince >= minDays;

        if (withinWindow && pastMinimum) {
            resultHTML = `<div class="guidance-content early-allowed">
                <strong>\u2705 Early administration is allowed.</strong>
                <p>Both criteria are met: the scheduled injection is <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong> away (within ${windowDays}-day window), and it has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection (minimum: ${minDays} days).</p>
            </div>`;
        } else {
            const windowMsg  = withinWindow
                ? `\u2705 Within ${windowDays}-day window (${daysUntil} day${daysUntil === 1 ? '' : 's'} away)`
                : `\u274c Not yet within ${windowDays}-day window (${daysUntil - windowDays} day${daysUntil - windowDays === 1 ? '' : 's'} remaining)`;
            const minDaysMsg = pastMinimum
                ? `\u2705 At least ${minDays} days since last injection (${daysSince} days)`
                : `\u274c Only ${daysSince} day${daysSince === 1 ? '' : 's'} since last injection (${minDays - daysSince} day${minDays - daysSince === 1 ? '' : 's'} remaining)`;
            resultHTML = `<div class="guidance-content early-not-allowed">
                <strong>\u274c Too early to administer.</strong>
                <p>${windowMsg}<br>${minDaysMsg}</p>
            </div>`;
        }
    } else if (hasMinDays) {
        // Pure since-last
        const lastDate  = val(LAST_INJECTION_DATE_ID);
        const daysSince = daysSinceDate(lastDate);
        const minDays   = entry.earlyMinDays!;

        rows = infoRow('Medication:', entry.displayName)
             + infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL)
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
        // Pure before-next
        const nextDate   = val(NEXT_INJECTION_DATE_ID);
        const daysUntil  = Math.max(0, -daysSinceDate(nextDate));
        const windowDays = entry.earlyDaysBeforeDue!;

        rows = infoRow('Medication:', entry.displayName)
             + infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL)
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
        ${(() => {
            const combined = [...(entry.earlyProviderNotification ?? []), ...(entry.commonProviderNotifications ?? [])];
            return combined.length
                ? `<div class="guidance-content">
                <h3 class="guidance-heading">When to notify provider:</h3>
                <ul>${combined.map(n => `<li>${md(n)}</li>`).join('')}</ul>
            </div>`
                : '';
        })()}
        <div class="important-note">
            <strong>\u26a0\ufe0f Important:</strong> If there may be a reason to administer even earlier than the specified timeframe, provider approval must be obtained.
        </div>`;

    injectGuidanceSection(rows, body);
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
        const medSelect = document.getElementById(MEDICATION_ID) as HTMLSelectElement | null;
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
        const formSection = document.querySelector<HTMLElement>(FORM_SECTION_SEL)!;
        const groupsHtml = Object.values(MED_REGISTRY)
            .flatMap(e => e.formGroupsSpec)
            .map(renderFieldGroup)
            .join('\n');
        formSection.insertAdjacentHTML('beforeend', groupsHtml);

        // Inject the early-date-group (next scheduled date — for before-next meds)
        const today = new Date().toISOString().split('T')[0];
        formSection.insertAdjacentHTML('beforeend',
            `<div class="input-group" id="${EARLY_DATE_GROUP_ID}" style="display: none;">
<label for="${NEXT_INJECTION_DATE_ID}">Next injection scheduled <span class="required">*</span></label>
<input type="date" id="${NEXT_INJECTION_DATE_ID}" class="date-input" min="${today}" onchange="checkAutoSubmit()">
</div>`);

        // Inject the early-last-date-group (last injection date — for since-last meds)
        formSection.insertAdjacentHTML('beforeend',
            `<div class="input-group" id="${EARLY_LAST_DATE_GROUP_ID}" style="display: none;">
<label for="${LAST_INJECTION_DATE_ID}">Date of last injection <span class="required">*</span></label>
<input type="date" id="${LAST_INJECTION_DATE_ID}" class="date-input" max="${today}" onchange="checkAutoSubmit()">
</div>`);
    } catch (err) {
        console.error('[initForm] Unexpected error:', err);
    }
}

initForm();

// ─── Guidance type segmented control ─────────────────────────────────────────

export function selectGuidanceType(value: string): void {
    const input = document.getElementById(GUIDANCE_TYPE_ID) as HTMLInputElement | null;
    if (input) input.value = value;
    document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-value]').forEach(btn => {
        btn.classList.toggle('seg-btn--active', btn.dataset.value === value);
    });
    handleGuidanceTypeChange();
}

// ─── Start Over ───────────────────────────────────────────────────────────────

export function startOver(): void {
    try {
        [MEDICATION_ID, GUIDANCE_TYPE_ID, ...Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds)]
            .forEach(clear);

        Object.values(MED_REGISTRY).forEach(e => {
            hide(e.lateFieldsGroup);
            e.subFieldGroups?.forEach(hide);
        });

        const earlyDateGroup = document.getElementById(EARLY_DATE_GROUP_ID)      as HTMLElement | null;
        const earlyLastGroup = document.getElementById(EARLY_LAST_DATE_GROUP_ID) as HTMLElement | null;
        if (earlyDateGroup) { earlyDateGroup.style.display = 'none'; }
        if (earlyLastGroup) { earlyLastGroup.style.display = 'none'; }
        clear(NEXT_INJECTION_DATE_ID);
        clear(LAST_INJECTION_DATE_ID);

        document.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(b => b.classList.remove('seg-btn--active'));
        const gtGroup = document.getElementById(GUIDANCE_TYPE_GROUP_ID) as HTMLElement | null;
        if (gtGroup) gtGroup.style.display = 'none';

        document.querySelector(GUIDANCE_SECTION_SEL)?.remove();
        document.querySelector<HTMLElement>(FORM_SECTION_SEL)!.style.display = 'block';
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
