import {
    getMedicationDisplayName,
    getEarlyGuidanceContent,
    MED_REGISTRY,
    type SubmitContext,
    type MedicationKey,
    type GuidanceResult,
    type AristadaGuidanceResult,
    type HafyeraCategory,
} from './logic';

// ─── Form Field Visibility ────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

function show(id: string): void { el(id).style.display = 'block'; }
function hide(id: string): void { el(id).style.display = 'none';  }
function val(id: string):  string { return (el<HTMLInputElement | HTMLSelectElement>(id)).value; }
function clear(id: string): void  { (el<HTMLInputElement | HTMLSelectElement>(id)).value = ''; }

export function handleMedicationChange(): void {
    handleGuidanceTypeChange();
}

export function handleGuidanceTypeChange(): void {
    const medication   = val('medication');
    const guidanceType = val('guidance-type');

    // Hide all late-guidance field groups (and any associated sub-field groups)
    Object.values(MED_REGISTRY).forEach(e => {
        hide(e.lateFieldsGroup);
        e.subFieldGroups?.forEach(hide);
    });

    Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).forEach(clear);

    if (guidanceType !== 'late') return;

    const entry = MED_REGISTRY[medication as MedicationKey];
    if (entry) show(entry.lateFieldsGroup);
}

export function handleInvegaTypeChange(): void {
    const entry = MED_REGISTRY[val('medication') as MedicationKey];
    if (!entry?.subGroupSelectorId) return;
    entry.handleSubGroupChange?.(val(entry.subGroupSelectorId), show, hide, clear);
}

// ─── Form Submit Handler ──────────────────────────────────────────────────────

export function handleSubmit(): void {
    const medication   = val('medication');
    const guidanceType = val('guidance-type');

    if (!medication)   { alert('Please select a medication.');    return; }
    if (!guidanceType) { alert('Please select a guidance type.'); return; }

    const ctx: SubmitContext = Object.fromEntries(
        Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds).map(id => [id, val(id)])
    );

    if (guidanceType === 'early') {
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

    const rows = infoRow('Medication:', getMedicationDisplayName(medication))
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + entry.buildLateInfoRows(ctx, daysSince).map(([label, value]) => infoRow(label, value)).join('');

    let body: string;
    if (entry.renderType === 'hafyera-category') {
        body = hafyeraCategoryBody(guidance as HafyeraCategory);
    } else if (entry.renderType === 'aristada') {
        body = aristadaBody(guidance as AristadaGuidanceResult);
    } else {
        body = threePartGuidance(guidance as GuidanceResult);
    }

    injectGuidanceSection(rows, body);
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
    return `
        <div class="guidance-content">
            <h3 class="guidance-heading">Ideal steps (do if possible):</h3>
            <div class="guidance-text">${guidance.idealSteps}</div>
        </div>
        <div class="guidance-content">
            <h3 class="guidance-heading">Acceptable pragmatic variations if ideal is not possible:</h3>
            <div class="guidance-text">${guidance.pragmaticVariations}</div>
        </div>
        <div class="guidance-content">
            <h3 class="guidance-heading">When to notify provider:</h3>
            <div class="guidance-text">${guidance.providerNotification}</div>
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

    document.querySelector('.app-header')!.insertAdjacentHTML('afterend', html);
    window.scrollTo(0, 0);
}

// ─── Guidance Display Functions ───────────────────────────────────────────────

function showEarlyGuidance(medication: string): void {
    const rows = infoRow('Medication:', getMedicationDisplayName(medication))
               + infoRow('Guidance Type:', 'Early Administration Guidance');

    const body = `
        <div class="guidance-content">
            <h3 class="guidance-heading">Time frame acceptable to give an "early" injection without seeking provider consult:</h3>
            <div class="guidance-text">${getEarlyGuidanceContent(medication)}</div>
        </div>
        <div class="important-note">
            <strong>⚠️ Important:</strong> If there may be a reason to administer even earlier than the specified timeframe, provider approval must be obtained.
        </div>`;

    injectGuidanceSection(rows, body);
}

function hafyeraCategoryBody(category: HafyeraCategory): string {
    const textMap: Record<HafyeraCategory, string> = {
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

function aristadaBody(guidance: AristadaGuidanceResult): string {
    if (guidance.notDue) {
        return `<div class="guidance-content">
                    <h3 class="guidance-heading">Guidance:</h3>
                    <div class="guidance-text">${guidance.message}</div>
                </div>`;
    }
    return `<div class="guidance-content">
                <h3 class="guidance-heading">Administer the usual Aristada dose as soon as possible, then assess the need for supplementation.</h3>
            </div>
            <div class="guidance-content">
                <h3 class="guidance-heading">Recommended supplementation:</h3>
                <div class="guidance-text">${guidance.supplementation}</div>
            </div>
            <div class="guidance-content">
                <h3 class="guidance-heading">When to notify provider:</h3>
                <div class="guidance-text">${guidance.providerNotification}</div>
            </div>`;
}
// ─── Start Over ───────────────────────────────────────────────────────────────

export function startOver(): void {
    ['medication', 'guidance-type', ...Object.values(MED_REGISTRY).flatMap(e => e.formFieldIds)]
        .forEach(clear);

    Object.values(MED_REGISTRY).forEach(e => {
        hide(e.lateFieldsGroup);
        e.subFieldGroups?.forEach(hide);
    });

    document.querySelector('.guidance-section')?.remove();
    document.querySelector<HTMLElement>('.form-section')!.style.display = 'block';
    window.scrollTo(0, 0);
}

// ─── Expose to HTML onclick handlers ─────────────────────────────────────────

declare global { interface Window {
    handleMedicationChange: typeof handleMedicationChange;
    handleGuidanceTypeChange: typeof handleGuidanceTypeChange;
    handleInvegaTypeChange: typeof handleInvegaTypeChange;
    handleSubmit: typeof handleSubmit;
    startOver: typeof startOver;
} }

window.handleMedicationChange  = handleMedicationChange;
window.handleGuidanceTypeChange = handleGuidanceTypeChange;
window.handleInvegaTypeChange   = handleInvegaTypeChange;
window.handleSubmit             = handleSubmit;
window.startOver                = startOver;
