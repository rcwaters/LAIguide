import {
    getMedicationDisplayName,
    getEarlyGuidanceContent,
    daysSinceDate,
    formatDate,
    formatWeeksAndDays,
    getInvegaInitiationGuidance,
    getInvegaMaintenanceGuidance,
    getInvegaTrinzaGuidance,
    getInvegaHafyeraGuidanceCategory,
    getAbilifyMaintenaGuidance,
    getAristadaGuidance,
    getUzedyGuidance,
    type GuidanceResult,
    type MaintenanceDose,
    type TrinzaDose,
    type AbilifyDoses,
    type AristadaDose,
    type UzedyDose,
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

    const conditionalGroups = [
        'invega-sustenna-options', 'trinza-fields', 'hafyera-fields',
        'abilify-fields', 'aristada-fields', 'uzedy-fields',
    ];
    conditionalGroups.forEach(hide);

    const fieldsToClear = [
        'invega-type', 'first-injection', 'last-maintenance', 'maintenance-dose',
        'last-trinza', 'trinza-dose', 'last-hafyera', 'last-abilify', 'abilify-doses',
        'last-aristada', 'aristada-dose', 'last-uzedy', 'uzedy-dose',
    ];
    fieldsToClear.forEach(clear);
    hide('first-injection-date');
    hide('maintenance-fields');

    if (guidanceType !== 'late') return;

    const fieldMap: Record<string, string> = {
        invega_sustenna:  'invega-sustenna-options',
        invega_trinza:    'trinza-fields',
        invega_hafyera:   'hafyera-fields',
        abilify_maintena: 'abilify-fields',
        aristada:         'aristada-fields',
        uzedy:            'uzedy-fields',
    };

    if (fieldMap[medication]) show(fieldMap[medication]);
}

export function handleInvegaTypeChange(): void {
    const invegaType = val('invega-type');

    if (invegaType === 'initiation') {
        show('first-injection-date');
        hide('maintenance-fields');
        clear('last-maintenance');
        clear('maintenance-dose');
    } else if (invegaType === 'maintenance') {
        hide('first-injection-date');
        show('maintenance-fields');
        clear('first-injection');
    } else {
        hide('first-injection-date');
        hide('maintenance-fields');
        clear('first-injection');
        clear('last-maintenance');
        clear('maintenance-dose');
    }
}

// ─── Form Validation ──────────────────────────────────────────────────────────

interface FormFields {
    medication: string;
    guidanceType: string;
    invegaType: string;
    firstInjectionDate: string;
    lastMaintenanceDate: string;
    maintenanceDose: string;
    lastTrinzaDate: string;
    trinzaDose: string;
    lastHafyeraDate: string;
    lastAbilifyDate: string;
    abilifyDoses: string;
    lastAristadaDate: string;
    aristadaDose: string;
    lastUzedyDate: string;
    uzedyDose: string;
}

function validateForm(f: FormFields): boolean {
    if (!f.medication)   { alert('Please select a medication.');    return false; }
    if (!f.guidanceType) { alert('Please select a guidance type.'); return false; }

    if (f.medication === 'invega_sustenna' && f.guidanceType === 'late') {
        if (!f.invegaType) { alert('Please select the Invega Sustenna injection type.'); return false; }
        if (f.invegaType === 'initiation' && !f.firstInjectionDate) {
            alert('Please enter the date of first (234 mg) injection.'); return false;
        }
        if (f.invegaType === 'maintenance') {
            if (!f.lastMaintenanceDate) { alert('Please enter the date of last maintenance injection.'); return false; }
            if (!f.maintenanceDose)     { alert('Please select the monthly maintenance injection dose.'); return false; }
        }
    }
    if (f.medication === 'invega_trinza' && f.guidanceType === 'late') {
        if (!f.lastTrinzaDate) { alert('Please enter the date of last Trinza injection.'); return false; }
        if (!f.trinzaDose)     { alert('Please select the Trinza injection dose.'); return false; }
    }
    if (f.medication === 'invega_hafyera' && f.guidanceType === 'late') {
        if (!f.lastHafyeraDate) { alert('Please enter the date of last Hafyera injection.'); return false; }
    }
    if (f.medication === 'abilify_maintena' && f.guidanceType === 'late') {
        if (!f.lastAbilifyDate) { alert('Please enter the date of last Abilify Maintena injection.'); return false; }
        if (!f.abilifyDoses)    { alert('Please select the number of prior consecutive monthly injections.'); return false; }
    }
    if (f.medication === 'aristada' && f.guidanceType === 'late') {
        if (!f.lastAristadaDate) { alert('Please enter the date of last Aristada injection.'); return false; }
        if (!f.aristadaDose)     { alert('Please select the dose of last Aristada injection.'); return false; }
    }
    if (f.medication === 'uzedy' && f.guidanceType === 'late') {
        if (!f.lastUzedyDate) { alert('Please enter the date of last Uzedy injection.'); return false; }
        if (!f.uzedyDose)     { alert('Please select the Uzedy maintenance dose.'); return false; }
    }
    return true;
}

// ─── Form Submit Handler ──────────────────────────────────────────────────────

export function handleSubmit(): void {
    const f: FormFields = {
        medication:          val('medication'),
        guidanceType:        val('guidance-type'),
        invegaType:          val('invega-type'),
        firstInjectionDate:  val('first-injection'),
        lastMaintenanceDate: val('last-maintenance'),
        maintenanceDose:     val('maintenance-dose'),
        lastTrinzaDate:      val('last-trinza'),
        trinzaDose:          val('trinza-dose'),
        lastHafyeraDate:     val('last-hafyera'),
        lastAbilifyDate:     val('last-abilify'),
        abilifyDoses:        val('abilify-doses'),
        lastAristadaDate:    val('last-aristada'),
        aristadaDose:        val('aristada-dose'),
        lastUzedyDate:       val('last-uzedy'),
        uzedyDose:           val('uzedy-dose'),
    };

    if (!validateForm(f)) return;

    if (f.guidanceType === 'early') {
        showEarlyGuidance(f.medication);
    } else if (f.medication === 'invega_sustenna' && f.invegaType === 'initiation') {
        showInvegaInitiationGuidance(f.firstInjectionDate);
    } else if (f.medication === 'invega_sustenna' && f.invegaType === 'maintenance') {
        showInvegaMaintenanceGuidance(f.lastMaintenanceDate, f.maintenanceDose as MaintenanceDose);
    } else if (f.medication === 'invega_trinza') {
        showInvegaTrinzaGuidance(f.lastTrinzaDate, f.trinzaDose as TrinzaDose);
    } else if (f.medication === 'invega_hafyera') {
        showInvegaHafyeraGuidance(f.lastHafyeraDate);
    } else if (f.medication === 'abilify_maintena') {
        showAbilifyMaintenaGuidance(f.lastAbilifyDate, f.abilifyDoses as AbilifyDoses);
    } else if (f.medication === 'aristada') {
        showAristadaGuidance(f.lastAristadaDate, f.aristadaDose as AristadaDose);
    } else if (f.medication === 'uzedy') {
        showUzedyGuidance(f.lastUzedyDate, f.uzedyDose as UzedyDose);
    } else {
        alert('Late/overdue guidance for this medication is coming soon!');
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

function showInvegaInitiationGuidance(firstInjectionDate: string): void {
    const days     = daysSinceDate(firstInjectionDate);
    const guidance = getInvegaInitiationGuidance(days);

    const rows = infoRow('Medication:', 'Invega Sustenna (paliperidone palmitate)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Injection Type:', 'Missed/delayed 2nd initiation (156 mg) injection')
               + infoRow('Date of first (234 mg) injection:', formatDate(firstInjectionDate))
               + infoRow('Time since first (234 mg) injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(rows, threePartGuidance(guidance));
}

function showInvegaMaintenanceGuidance(lastMaintenanceDate: string, maintenanceDose: MaintenanceDose): void {
    const days      = daysSinceDate(lastMaintenanceDate);
    const guidance  = getInvegaMaintenanceGuidance(days, maintenanceDose);
    const doseLabel = maintenanceDose === '156-or-less' ? '156 mg or less' : '234 mg';

    const rows = infoRow('Medication:', 'Invega Sustenna (paliperidone palmitate)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Injection Type:', 'Missed/delayed monthly maintenance injection')
               + infoRow('Date of last maintenance injection:', formatDate(lastMaintenanceDate))
               + infoRow('Monthly maintenance dose:', doseLabel)
               + infoRow('Time since last maintenance injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(rows, threePartGuidance(guidance));
}

function showInvegaTrinzaGuidance(lastTrinzaDate: string, trinzaDose: TrinzaDose): void {
    const days        = daysSinceDate(lastTrinzaDate);
    const monthsSince = Math.floor(days / 30.44);
    const guidance    = getInvegaTrinzaGuidance(days, trinzaDose);

    const rows = infoRow('Medication:', 'Invega Trinza (paliperidone palmitate 3-month)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Date of last Trinza injection:', formatDate(lastTrinzaDate))
               + infoRow('Trinza injection dose:', `${trinzaDose} mg`)
               + infoRow('Time since last Trinza injection:', `${days} days (approximately ${monthsSince} months)`);

    injectGuidanceSection(rows, threePartGuidance(guidance));
}

function showInvegaHafyeraGuidance(lastHafyeraDate: string): void {
    const days        = daysSinceDate(lastHafyeraDate);
    const monthsSince = Math.floor(days / 30.44);
    const category    = getInvegaHafyeraGuidanceCategory(days);

    const guidanceTextMap: Record<string, string> = {
        'early':   '<p>The Hafyera injection is not yet overdue. Please consult guidance on early dosing.</p>',
        'on-time': '<p>Proceed with administering the Hafyera injection. Plan for the subsequent injection in 6 months.</p>',
        'consult': `<p><strong>CONSULT PROVIDER REQUIRED</strong></p>
                    <p>The patient is presenting more than 6 months and 3 weeks after the last Hafyera dose.</p>
                    <p>Please consult a provider prior to proceeding with any injection.</p>`,
    };

    const body = `
        <div class="guidance-content">
            <h3 class="guidance-heading">Guidance:</h3>
            <div class="guidance-text">${guidanceTextMap[category]}</div>
        </div>`;

    const rows = infoRow('Medication:', 'Invega Hafyera (paliperidone palmitate 6-month)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Date of last Hafyera injection:', formatDate(lastHafyeraDate))
               + infoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)} or approximately ${monthsSince} months)`);

    injectGuidanceSection(rows, body);
}

function showAbilifyMaintenaGuidance(lastAbilifyDate: string, abilifyDoses: AbilifyDoses): void {
    const days       = daysSinceDate(lastAbilifyDate);
    const weeks      = Math.floor(days / 7);
    const guidance   = getAbilifyMaintenaGuidance(weeks, abilifyDoses);
    const dosesLabel = abilifyDoses === '1-2' ? '1 or 2 monthly doses' : '3 or more monthly doses';

    const rows = infoRow('Medication:', 'Abilify Maintena (aripiprazole)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Date of last injection:', formatDate(lastAbilifyDate))
               + infoRow('Prior consecutive doses:', dosesLabel)
               + infoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(rows, threePartGuidance(guidance));
}

function showAristadaGuidance(lastAristadaDate: string, aristadaDose: AristadaDose): void {
    const days     = daysSinceDate(lastAristadaDate);
    const guidance = getAristadaGuidance(days, aristadaDose);

    const rows = infoRow('Medication:', 'Aristada (aripiprazole lauroxil)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Date of last injection:', formatDate(lastAristadaDate))
               + infoRow('Dose of last injection:', `${aristadaDose} mg`)
               + infoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    let body: string;
    if (guidance.notDue) {
        body = `<div class="guidance-content">
                    <h3 class="guidance-heading">Guidance:</h3>
                    <div class="guidance-text">${guidance.message}</div>
                </div>`;
    } else {
        body = `<div class="guidance-content">
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

    injectGuidanceSection(rows, body);
}

function showUzedyGuidance(lastUzedyDate: string, uzedyDose: UzedyDose): void {
    const days      = daysSinceDate(lastUzedyDate);
    const guidance  = getUzedyGuidance(days, uzedyDose);
    const doseLabel = uzedyDose === '150-or-less' ? '150 mg or less' : '200 mg or more';

    const rows = infoRow('Medication:', 'Uzedy (risperidone subcutaneous)')
               + infoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
               + infoRow('Date of last injection:', formatDate(lastUzedyDate))
               + infoRow('Uzedy maintenance dose:', doseLabel)
               + infoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(rows, threePartGuidance(guidance));
}

// ─── Start Over ───────────────────────────────────────────────────────────────

export function startOver(): void {
    const fieldIds = [
        'medication', 'guidance-type', 'invega-type', 'first-injection',
        'last-maintenance', 'maintenance-dose', 'last-trinza', 'trinza-dose',
        'last-hafyera', 'last-abilify', 'abilify-doses', 'last-aristada',
        'aristada-dose', 'last-uzedy', 'uzedy-dose',
    ];
    fieldIds.forEach(clear);

    const hiddenGroups = [
        'invega-sustenna-options', 'first-injection-date', 'maintenance-fields',
        'trinza-fields', 'hafyera-fields', 'abilify-fields', 'aristada-fields', 'uzedy-fields',
    ];
    hiddenGroups.forEach(hide);

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
