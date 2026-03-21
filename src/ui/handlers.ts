import type { MedicationKey } from '../interfaces/med';
import type { SubmitContext, GuidanceResult } from '../interfaces/guidance';
import { MED_REGISTRY } from '../medLoader';
import { val, show, hide, clear } from './domHelpers';
import {
    MEDICATION_ID,
    GUIDANCE_TYPE_ID,
    GUIDANCE_TYPE_GROUP_ID,
    GUIDANCE_SECTION_SEL,
    EARLY_DATE_GROUP_ID,
    EARLY_LAST_DATE_GROUP_ID,
    NEXT_INJECTION_DATE_ID,
    LAST_INJECTION_DATE_ID,
    LATE_GUIDANCE_LABEL,
    ADDICTION_MEDICINE_LABEL,
} from './domIds';
import { infoRow, threePartGuidance, injectGuidanceSection } from './guidanceRenderer';
import { showEarlyGuidance } from './earlyGuidance';

export function handleGuidanceTypeChange(): void {
    const medication = val(MEDICATION_ID);
    const guidanceType = val(GUIDANCE_TYPE_ID);

    const gtGroup = document.getElementById(GUIDANCE_TYPE_GROUP_ID) as HTMLElement | null;
    if (gtGroup) gtGroup.style.display = medication ? 'block' : 'none';
    if (!medication) {
        clear(GUIDANCE_TYPE_ID);
    }

    Object.values(MED_REGISTRY).forEach((e) => {
        hide(e.lateFieldsGroup);
        e.subFieldGroups?.forEach(hide);
    });

    Object.values(MED_REGISTRY)
        .flatMap((e) => e.formFieldIds)
        .forEach(clear);

    const earlyGroup = document.getElementById(EARLY_DATE_GROUP_ID) as HTMLElement | null;
    const earlyLastGroup = document.getElementById(EARLY_LAST_DATE_GROUP_ID) as HTMLElement | null;
    if (guidanceType === 'early' && medication) {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry?.earlyParamField) {
            show(entry.lateFieldsGroup);
            if (earlyGroup) {
                earlyGroup.style.display = 'none';
                clear(NEXT_INJECTION_DATE_ID);
            }
            if (earlyLastGroup) {
                earlyLastGroup.style.display = 'none';
                clear(LAST_INJECTION_DATE_ID);
            }
        } else {
            const hasDaysBeforeDue = !!entry?.earlyDaysBeforeDue;
            const hasMinDays = !!entry?.earlyMinDays;
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
        if (earlyGroup) {
            earlyGroup.style.display = 'none';
            clear(NEXT_INJECTION_DATE_ID);
        }
        if (earlyLastGroup) {
            earlyLastGroup.style.display = 'none';
            clear(LAST_INJECTION_DATE_ID);
        }
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

export function checkAutoSubmit(): void {
    if (document.querySelector(GUIDANCE_SECTION_SEL)) return;
    const medication = val(MEDICATION_ID);
    const guidanceType = val(GUIDANCE_TYPE_ID);
    if (!medication || !guidanceType) return;

    if (guidanceType === 'early') {
        const entry = MED_REGISTRY[medication as MedicationKey];
        if (entry?.earlyParamField) {
            const paramVal = val(entry.earlyParamField);
            if (!paramVal) return;
            const varDef = entry.earlyVariantMap?.[paramVal];
            if (!varDef?.noGuidanceMessage && entry.earlyDateField && !val(entry.earlyDateField))
                return;
            handleSubmit();
            return;
        }
        if (entry?.earlyDaysBeforeDue && !val(NEXT_INJECTION_DATE_ID)) return;
        if (entry?.earlyMinDays && !val(LAST_INJECTION_DATE_ID)) return;
        handleSubmit();
        return;
    }

    const groups = document.querySelectorAll<HTMLElement>('.input-group[id]');
    for (const group of groups) {
        if (group.id === GUIDANCE_TYPE_GROUP_ID) continue;
        if (group.style.display === 'none') continue;
        for (const input of group.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            'input.date-input, select',
        )) {
            if (!input.value) return;
        }
    }
    handleSubmit();
}

export function handleSubmit(): void {
    try {
        const medication = val(MEDICATION_ID);
        const guidanceType = val(GUIDANCE_TYPE_ID);

        if (!medication) {
            alert('Please select a medication.');
            return;
        }
        if (!guidanceType) {
            alert('Please select a guidance type.');
            return;
        }

        const ctx: SubmitContext = Object.fromEntries(
            Object.values(MED_REGISTRY)
                .flatMap((e) => e.formFieldIds)
                .map((id) => [id, val(id)]),
        );

        if (guidanceType === 'early') {
            const entry = MED_REGISTRY[medication as MedicationKey];
            if (entry?.earlyParamField) {
                const paramVal = val(entry.earlyParamField);
                if (!paramVal) {
                    alert('Please select the formulation and dose.');
                    return;
                }
                const varDef = entry.earlyVariantMap?.[paramVal];
                if (
                    !varDef?.noGuidanceMessage &&
                    entry.earlyDateField &&
                    !val(entry.earlyDateField)
                ) {
                    alert('Please enter the date of the last injection.');
                    return;
                }
                showEarlyGuidance(medication, paramVal);
                return;
            }
            if (entry?.earlyDaysBeforeDue && !val(NEXT_INJECTION_DATE_ID)) {
                alert('Please enter the next scheduled injection date.');
                return;
            }
            if (entry?.earlyMinDays && !val(LAST_INJECTION_DATE_ID)) {
                alert('Please enter the date of the last injection.');
                return;
            }
            showEarlyGuidance(medication);
            return;
        }

        const entry = MED_REGISTRY[medication as MedicationKey];
        if (!entry) {
            alert('Late/overdue guidance for this medication does not exist.');
            return;
        }

        const validationErr = entry.validateLate(ctx);
        if (validationErr) {
            alert(validationErr);
            return;
        }

        const params = entry.buildLateParams(ctx);
        const guidance = entry.getLateGuidance(params);
        const daysSince = params.daysSince!;

        const rows =
            infoRow('Medication:', entry.displayName) +
            infoRow('Guidance Type:', LATE_GUIDANCE_LABEL) +
            entry
                .buildLateInfoRows(ctx, daysSince)
                .map(([label, value]) => infoRow(label, value))
                .join('');

        const body = threePartGuidance(
            guidance as GuidanceResult,
            entry.commonProviderNotifications,
            entry.optgroupLabel === ADDICTION_MEDICINE_LABEL,
        );

        injectGuidanceSection(rows, body);
    } catch (err) {
        console.error('[handleSubmit] Unexpected error:', err);
        const errorBody = `<div class="guidance-content early-not-allowed">
            <p>⚠️ An internal error has occurred, please refer to protocol document for now.</p>
        </div>`;
        injectGuidanceSection('', errorBody);
    }
}

export function selectGuidanceType(value: string): void {
    const input = document.getElementById(GUIDANCE_TYPE_ID) as HTMLInputElement | null;
    if (input) input.value = value;
    document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-value]').forEach((btn) => {
        btn.classList.toggle('seg-btn--active', btn.dataset.value === value);
    });
    handleGuidanceTypeChange();
}

export function startOver(): void {
    try {
        [
            MEDICATION_ID,
            GUIDANCE_TYPE_ID,
            ...Object.values(MED_REGISTRY).flatMap((e) => e.formFieldIds),
        ].forEach(clear);

        Object.values(MED_REGISTRY).forEach((e) => {
            hide(e.lateFieldsGroup);
            e.subFieldGroups?.forEach(hide);
        });

        const earlyDateGroup = document.getElementById(EARLY_DATE_GROUP_ID) as HTMLElement | null;
        const earlyLastGroup = document.getElementById(
            EARLY_LAST_DATE_GROUP_ID,
        ) as HTMLElement | null;
        if (earlyDateGroup) {
            earlyDateGroup.style.display = 'none';
        }
        if (earlyLastGroup) {
            earlyLastGroup.style.display = 'none';
        }
        clear(NEXT_INJECTION_DATE_ID);
        clear(LAST_INJECTION_DATE_ID);

        document
            .querySelectorAll<HTMLButtonElement>('.seg-btn')
            .forEach((b) => b.classList.remove('seg-btn--active'));
        const gtGroup = document.getElementById(GUIDANCE_TYPE_GROUP_ID) as HTMLElement | null;
        if (gtGroup) gtGroup.style.display = 'none';

        document.querySelector(GUIDANCE_SECTION_SEL)?.remove();
        document.querySelector<HTMLElement>('.form-section')!.style.display = 'block';
        window.scrollTo(0, 0);
    } catch (err) {
        console.error('[startOver] Unexpected error:', err);
    }
}
