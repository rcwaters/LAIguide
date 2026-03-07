// ─── Form Field Visibility ────────────────────────────────────────────────────

function handleMedicationChange() {
    handleGuidanceTypeChange();
}

function handleGuidanceTypeChange() {
    const medication   = document.getElementById('medication').value;
    const guidanceType = document.getElementById('guidance-type').value;

    // Hide all conditional field groups
    const conditionalGroups = [
        'invega-sustenna-options',
        'trinza-fields',
        'hafyera-fields',
        'abilify-fields',
        'aristada-fields',
        'uzedy-fields',
    ];
    conditionalGroups.forEach(id => {
        document.getElementById(id).style.display = 'none';
    });

    // Clear all dynamic field values
    document.getElementById('invega-type').value       = '';
    document.getElementById('first-injection-date').style.display = 'none';
    document.getElementById('first-injection').value   = '';
    document.getElementById('maintenance-fields').style.display = 'none';
    document.getElementById('last-maintenance').value  = '';
    document.getElementById('maintenance-dose').value  = '';
    document.getElementById('last-trinza').value        = '';
    document.getElementById('trinza-dose').value        = '';
    document.getElementById('last-hafyera').value       = '';
    document.getElementById('last-abilify').value       = '';
    document.getElementById('abilify-doses').value      = '';
    document.getElementById('last-aristada').value      = '';
    document.getElementById('aristada-dose').value      = '';
    document.getElementById('last-uzedy').value         = '';
    document.getElementById('uzedy-dose').value         = '';

    if (guidanceType !== 'late') return;

    const fieldMap = {
        invega_sustenna:  'invega-sustenna-options',
        invega_trinza:    'trinza-fields',
        invega_hafyera:   'hafyera-fields',
        abilify_maintena: 'abilify-fields',
        aristada:         'aristada-fields',
        uzedy:            'uzedy-fields',
    };

    if (fieldMap[medication]) {
        document.getElementById(fieldMap[medication]).style.display = 'block';
    }
}

function handleInvegaTypeChange() {
    const invegaType         = document.getElementById('invega-type').value;
    const firstInjectionDate = document.getElementById('first-injection-date');
    const maintenanceFields  = document.getElementById('maintenance-fields');

    if (invegaType === 'initiation') {
        firstInjectionDate.style.display = 'block';
        maintenanceFields.style.display  = 'none';
        document.getElementById('last-maintenance').value = '';
        document.getElementById('maintenance-dose').value = '';
    } else if (invegaType === 'maintenance') {
        firstInjectionDate.style.display = 'none';
        maintenanceFields.style.display  = 'block';
        document.getElementById('first-injection').value  = '';
    } else {
        firstInjectionDate.style.display = 'none';
        maintenanceFields.style.display  = 'none';
        document.getElementById('first-injection').value  = '';
        document.getElementById('last-maintenance').value = '';
        document.getElementById('maintenance-dose').value = '';
    }
}

// ─── Form Validation ──────────────────────────────────────────────────────────

function validateForm(fields) {
    const { medication, guidanceType, invegaType, firstInjectionDate,
            lastMaintenanceDate, maintenanceDose, lastTrinzaDate, trinzaDose,
            lastHafyeraDate, lastAbilifyDate, abilifyDoses, lastAristadaDate,
            aristadaDose, lastUzedyDate, uzedyDose } = fields;

    if (!medication)   { alert('Please select a medication.');      return false; }
    if (!guidanceType) { alert('Please select a guidance type.');   return false; }

    if (medication === 'invega_sustenna' && guidanceType === 'late') {
        if (!invegaType) { alert('Please select the Invega Sustenna injection type.'); return false; }
        if (invegaType === 'initiation' && !firstInjectionDate) {
            alert('Please enter the date of first (234 mg) injection.'); return false;
        }
        if (invegaType === 'maintenance') {
            if (!lastMaintenanceDate) { alert('Please enter the date of last maintenance injection.'); return false; }
            if (!maintenanceDose)     { alert('Please select the monthly maintenance injection dose.'); return false; }
        }
    }
    if (medication === 'invega_trinza' && guidanceType === 'late') {
        if (!lastTrinzaDate) { alert('Please enter the date of last Trinza injection.'); return false; }
        if (!trinzaDose)     { alert('Please select the Trinza injection dose.'); return false; }
    }
    if (medication === 'invega_hafyera' && guidanceType === 'late') {
        if (!lastHafyeraDate) { alert('Please enter the date of last Hafyera injection.'); return false; }
    }
    if (medication === 'abilify_maintena' && guidanceType === 'late') {
        if (!lastAbilifyDate) { alert('Please enter the date of last Abilify Maintena injection.'); return false; }
        if (!abilifyDoses)    { alert('Please select the number of prior consecutive monthly injections.'); return false; }
    }
    if (medication === 'aristada' && guidanceType === 'late') {
        if (!lastAristadaDate) { alert('Please enter the date of last Aristada injection.'); return false; }
        if (!aristadaDose)     { alert('Please select the dose of last Aristada injection.'); return false; }
    }
    if (medication === 'uzedy' && guidanceType === 'late') {
        if (!lastUzedyDate) { alert('Please enter the date of last Uzedy injection.'); return false; }
        if (!uzedyDose)     { alert('Please select the Uzedy maintenance dose.'); return false; }
    }
    return true;
}

// ─── Form Submit Handler ──────────────────────────────────────────────────────

function handleSubmit() {
    const fields = {
        medication:          document.getElementById('medication').value,
        guidanceType:        document.getElementById('guidance-type').value,
        invegaType:          document.getElementById('invega-type').value,
        firstInjectionDate:  document.getElementById('first-injection').value,
        lastMaintenanceDate: document.getElementById('last-maintenance').value,
        maintenanceDose:     document.getElementById('maintenance-dose').value,
        lastTrinzaDate:      document.getElementById('last-trinza').value,
        trinzaDose:          document.getElementById('trinza-dose').value,
        lastHafyeraDate:     document.getElementById('last-hafyera').value,
        lastAbilifyDate:     document.getElementById('last-abilify').value,
        abilifyDoses:        document.getElementById('abilify-doses').value,
        lastAristadaDate:    document.getElementById('last-aristada').value,
        aristadaDose:        document.getElementById('aristada-dose').value,
        lastUzedyDate:       document.getElementById('last-uzedy').value,
        uzedyDose:           document.getElementById('uzedy-dose').value,
    };

    if (!validateForm(fields)) return;

    const { medication, guidanceType, invegaType,
            firstInjectionDate, lastMaintenanceDate, maintenanceDose,
            lastTrinzaDate, trinzaDose, lastHafyeraDate,
            lastAbilifyDate, abilifyDoses,
            lastAristadaDate, aristadaDose,
            lastUzedyDate, uzedyDose } = fields;

    if (guidanceType === 'early') {
        showEarlyGuidance(medication);
    } else if (medication === 'invega_sustenna' && invegaType === 'initiation') {
        showInvegaInitiationGuidance(firstInjectionDate);
    } else if (medication === 'invega_sustenna' && invegaType === 'maintenance') {
        showInvegaMaintenanceGuidance(lastMaintenanceDate, maintenanceDose);
    } else if (medication === 'invega_trinza') {
        showInvegaTrinzaGuidance(lastTrinzaDate, trinzaDose);
    } else if (medication === 'invega_hafyera') {
        showInvegaHafyeraGuidance(lastHafyeraDate);
    } else if (medication === 'abilify_maintena') {
        showAbilifyMaintenaGuidance(lastAbilifyDate, abilifyDoses);
    } else if (medication === 'aristada') {
        showAristadaGuidance(lastAristadaDate, aristadaDose);
    } else if (medication === 'uzedy') {
        showUzedyGuidance(lastUzedyDate, uzedyDose);
    } else {
        alert('Late/overdue guidance for this medication is coming soon!');
    }
}

// ─── Guidance Rendering Helpers ───────────────────────────────────────────────

function renderMedicationInfoRow(label, value) {
    return `
        <div class="info-row">
            <span class="info-label">${label}</span>
            <span class="info-value">${value}</span>
        </div>`;
}

function renderThreePartGuidance(guidance) {
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

function injectGuidanceSection(infoRows, bodyHTML) {
    document.querySelector('.form-section').style.display = 'none';

    const html = `
        <div class="guidance-section">
            <div class="medication-info">${infoRows}</div>
            ${bodyHTML}
            <div style="text-align: center; margin-top: 30px;">
                <button type="button" class="btn" onclick="startOver()">Start Over</button>
            </div>
        </div>`;

    document.querySelector('.app-header').insertAdjacentHTML('afterend', html);
    window.scrollTo(0, 0);
}

// ─── Guidance Display Functions ───────────────────────────────────────────────

function showEarlyGuidance(medication) {
    const infoRows = renderMedicationInfoRow('Medication:', getMedicationDisplayName(medication))
                   + renderMedicationInfoRow('Guidance Type:', 'Early Administration Guidance');

    const body = `
        <div class="guidance-content">
            <h3 class="guidance-heading">Time frame acceptable to give an "early" injection without seeking provider consult:</h3>
            <div class="guidance-text">${getEarlyGuidanceContent(medication)}</div>
        </div>
        <div class="important-note">
            <strong>⚠️ Important:</strong> If there may be a reason to administer even earlier than the specified timeframe, provider approval must be obtained.
        </div>`;

    injectGuidanceSection(infoRows, body);
}

function showInvegaInitiationGuidance(firstInjectionDate) {
    const days     = daysSinceDate(firstInjectionDate);
    const guidance = getInvegaInitiationGuidance(days);

    const infoRows = renderMedicationInfoRow('Medication:', 'Invega Sustenna (paliperidone palmitate)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Injection Type:', 'Missed/delayed 2nd initiation (156 mg) injection')
                   + renderMedicationInfoRow('Date of first (234 mg) injection:', formatDate(firstInjectionDate))
                   + renderMedicationInfoRow('Time since first (234 mg) injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(infoRows, renderThreePartGuidance(guidance));
}

function showInvegaMaintenanceGuidance(lastMaintenanceDate, maintenanceDose) {
    const days     = daysSinceDate(lastMaintenanceDate);
    const guidance = getInvegaMaintenanceGuidance(days, maintenanceDose);
    const doseLabel = maintenanceDose === '156-or-less' ? '156 mg or less' : '234 mg';

    const infoRows = renderMedicationInfoRow('Medication:', 'Invega Sustenna (paliperidone palmitate)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Injection Type:', 'Missed/delayed monthly maintenance injection')
                   + renderMedicationInfoRow('Date of last maintenance injection:', formatDate(lastMaintenanceDate))
                   + renderMedicationInfoRow('Monthly maintenance dose:', doseLabel)
                   + renderMedicationInfoRow('Time since last maintenance injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(infoRows, renderThreePartGuidance(guidance));
}

function showInvegaTrinzaGuidance(lastTrinzaDate, trinzaDose) {
    const days        = daysSinceDate(lastTrinzaDate);
    const monthsSince = Math.floor(days / 30.44);
    const guidance    = getInvegaTrinzaGuidance(days, trinzaDose);

    const infoRows = renderMedicationInfoRow('Medication:', 'Invega Trinza (paliperidone palmitate 3-month)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Date of last Trinza injection:', formatDate(lastTrinzaDate))
                   + renderMedicationInfoRow('Trinza injection dose:', `${trinzaDose} mg`)
                   + renderMedicationInfoRow('Time since last Trinza injection:', `${days} days (approximately ${monthsSince} months)`);

    injectGuidanceSection(infoRows, renderThreePartGuidance(guidance));
}

function showInvegaHafyeraGuidance(lastHafyeraDate) {
    const days        = daysSinceDate(lastHafyeraDate);
    const monthsSince = Math.floor(days / 30.44);
    const category    = getInvegaHafyeraGuidanceCategory(days);

    const guidanceContentMap = {
        early:   '<p>The Hafyera injection is not yet overdue. Please consult guidance on early dosing.</p>',
        'on-time': '<p>Proceed with administering the Hafyera injection. Plan for the subsequent injection in 6 months.</p>',
        consult: `<p><strong>CONSULT PROVIDER REQUIRED</strong></p>
                  <p>The patient is presenting more than 6 months and 3 weeks after the last Hafyera dose.</p>
                  <p>Please consult a provider prior to proceeding with any injection.</p>`,
    };

    const body = `
        <div class="guidance-content">
            <h3 class="guidance-heading">Guidance:</h3>
            <div class="guidance-text">${guidanceContentMap[category]}</div>
        </div>`;

    const infoRows = renderMedicationInfoRow('Medication:', 'Invega Hafyera (paliperidone palmitate 6-month)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Date of last Hafyera injection:', formatDate(lastHafyeraDate))
                   + renderMedicationInfoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)} or approximately ${monthsSince} months)`);

    injectGuidanceSection(infoRows, body);
}

function showAbilifyMaintenaGuidance(lastAbilifyDate, abilifyDoses) {
    const days       = daysSinceDate(lastAbilifyDate);
    const weeks      = Math.floor(days / 7);
    const guidance   = getAbilifyMaintenaGuidance(weeks, abilifyDoses);
    const dosesLabel = abilifyDoses === '1-2' ? '1 or 2 monthly doses' : '3 or more monthly doses';

    const infoRows = renderMedicationInfoRow('Medication:', 'Abilify Maintena (aripiprazole)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Date of last injection:', formatDate(lastAbilifyDate))
                   + renderMedicationInfoRow('Prior consecutive doses:', dosesLabel)
                   + renderMedicationInfoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(infoRows, renderThreePartGuidance(guidance));
}

function showAristadaGuidance(lastAristadaDate, aristadaDose) {
    const days     = daysSinceDate(lastAristadaDate);
    const guidance = getAristadaGuidance(days, aristadaDose);

    const infoRows = renderMedicationInfoRow('Medication:', 'Aristada (aripiprazole lauroxil)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Date of last injection:', formatDate(lastAristadaDate))
                   + renderMedicationInfoRow('Dose of last injection:', `${aristadaDose} mg`)
                   + renderMedicationInfoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    let body;
    if (guidance.notDue) {
        body = `
            <div class="guidance-content">
                <h3 class="guidance-heading">Guidance:</h3>
                <div class="guidance-text">${guidance.message}</div>
            </div>`;
    } else {
        body = `
            <div class="guidance-content">
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

    injectGuidanceSection(infoRows, body);
}

function showUzedyGuidance(lastUzedyDate, uzedyDose) {
    const days      = daysSinceDate(lastUzedyDate);
    const guidance  = getUzedyGuidance(days, uzedyDose);
    const doseLabel = uzedyDose === '150-or-less' ? '150 mg or less' : '200 mg or more';

    const infoRows = renderMedicationInfoRow('Medication:', 'Uzedy (risperidone subcutaneous)')
                   + renderMedicationInfoRow('Guidance Type:', 'Late/Overdue Administration Guidance')
                   + renderMedicationInfoRow('Date of last injection:', formatDate(lastUzedyDate))
                   + renderMedicationInfoRow('Uzedy maintenance dose:', doseLabel)
                   + renderMedicationInfoRow('Time since last injection:', `${days} days (${formatWeeksAndDays(days)})`);

    injectGuidanceSection(infoRows, renderThreePartGuidance(guidance));
}

// ─── Start Over ───────────────────────────────────────────────────────────────

function startOver() {
    const fieldIds = [
        'medication', 'guidance-type', 'invega-type', 'first-injection',
        'last-maintenance', 'maintenance-dose', 'last-trinza', 'trinza-dose',
        'last-hafyera', 'last-abilify', 'abilify-doses', 'last-aristada',
        'aristada-dose', 'last-uzedy', 'uzedy-dose',
    ];
    fieldIds.forEach(id => { document.getElementById(id).value = ''; });

    const hiddenGroups = [
        'invega-sustenna-options', 'first-injection-date', 'maintenance-fields',
        'trinza-fields', 'hafyera-fields', 'abilify-fields', 'aristada-fields', 'uzedy-fields',
    ];
    hiddenGroups.forEach(id => { document.getElementById(id).style.display = 'none'; });

    const guidanceSection = document.querySelector('.guidance-section');
    if (guidanceSection) guidanceSection.remove();

    document.querySelector('.form-section').style.display = 'block';
    window.scrollTo(0, 0);
}
