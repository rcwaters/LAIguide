import type { MedicationKey } from '../interfaces/med';
import { MED_REGISTRY } from '../medLoader';
import { md, daysSinceDate, formatDate, pluralize } from '../utils';
import { val } from './domHelpers';
import { NEXT_INJECTION_DATE_ID, LAST_INJECTION_DATE_ID, EARLY_GUIDANCE_LABEL, ADDICTION_MEDICINE_LABEL } from './domIds';
import { infoRow, addictionMedicineAccordion, injectGuidanceSection, buildNotifyBlock } from './guidanceRenderer';

function earlyResultBox(allowed: boolean, strong: string, detail?: string): string {
    const cls = allowed ? 'early-allowed' : 'early-not-allowed';
    return `<div class="guidance-content ${cls}"><strong>${strong}</strong>${detail ? `<p>${detail}</p>` : ''}</div>`;
}

function minDaysResult(daysSince: number, minDays: number): string {
    if (daysSince >= minDays) {
        return earlyResultBox(
            true,
            '\u2705 Early administration is allowed.',
            `It has been <strong>${pluralize(daysSince, 'day')}</strong> since the last injection (minimum: ${minDays} days).`,
        );
    }
    const remaining = minDays - daysSince;
    return earlyResultBox(
        false,
        '\u274c Too early to administer.',
        `It has been <strong>${pluralize(daysSince, 'day')}</strong> since the last injection. Early administration requires at least <strong>${minDays} days</strong> since the last injection (<strong>${pluralize(remaining, 'day')}</strong> remaining).`,
    );
}

export function showEarlyGuidance(medication: string, variantKey?: string): void {
    try {
        const entry = MED_REGISTRY[medication as MedicationKey];

        // ── Variant-aware early guidance (e.g. Brixadi monthly vs. weekly) ────────
        if (variantKey != null && entry.earlyVariantMap) {
            const varDef = entry.earlyVariantMap[variantKey];

            const allFields = entry.formGroupsSpec.flatMap((g) => g.fields);
            const selectField = allFields.find(
                (f) => f.type === 'select' && f.id === entry.earlyParamField,
            );
            const selectedLabel =
                selectField?.type === 'select'
                    ? (selectField.options.find((o) => o.value === variantKey)?.label ?? variantKey)
                    : variantKey;

            const rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Formulation:', selectedLabel);

            if (varDef?.noGuidanceMessage) {
                injectGuidanceSection(
                    rows,
                    `<div class="guidance-content early-not-allowed"><p>ℹ️ ${varDef.noGuidanceMessage}</p></div>`,
                );
                return;
            }

            const lastDate = val(entry.earlyDateField ?? LAST_INJECTION_DATE_ID);
            const daysSince = daysSinceDate(lastDate);
            const minDays = varDef?.minDays ?? entry.earlyMinDays!;
            const rowsWithDate = rows + infoRow('Last injection:', formatDate(lastDate));

            const notifs = [
                ...(entry.earlyProviderNotification ?? []),
                ...(entry.commonProviderNotifications ?? []),
            ];
            const body = `
            ${minDaysResult(daysSince, minDays)}
            <div class="guidance-content no-box">
                <h3 class="guidance-heading">Early administration window:</h3>
                <div class="guidance-text">${md(entry.earlyGuidance)}</div>
            </div>
            ${buildNotifyBlock(notifs)}
            ${entry.optgroupLabel === ADDICTION_MEDICINE_LABEL ? addictionMedicineAccordion() : ''}`;

            injectGuidanceSection(rowsWithDate, body);
            return;
        }

        // ── Standard (non-variant) early guidance ─────────────────────────────────
        const hasDaysBeforeDue = !!entry.earlyDaysBeforeDue;
        const hasMinDays = !!entry.earlyMinDays;

        let rows: string;
        let resultHTML: string;

        if (hasDaysBeforeDue && hasMinDays) {
            const nextDate = val(NEXT_INJECTION_DATE_ID);
            const lastDate = val(LAST_INJECTION_DATE_ID);
            const daysUntil = Math.max(0, -daysSinceDate(nextDate));
            const daysSince = daysSinceDate(lastDate);
            const windowDays = entry.earlyDaysBeforeDue!;
            const minDays = entry.earlyMinDays!;

            rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Next injection scheduled:', formatDate(nextDate)) +
                infoRow('Last injection:', formatDate(lastDate));

            const withinWindow = daysUntil === 0 || daysUntil <= windowDays;
            const pastMinimum = daysSince >= minDays;

            if (withinWindow && pastMinimum) {
                resultHTML = earlyResultBox(
                    true,
                    '\u2705 Early administration is allowed.',
                    `Both criteria are met: the scheduled injection is <strong>${pluralize(daysUntil, 'day')}</strong> away (within ${windowDays}-day window), and it has been <strong>${pluralize(daysSince, 'day')}</strong> since the last injection (minimum: ${minDays} days).`,
                );
            } else {
                const windowMsg = withinWindow
                    ? `\u2705 Within ${windowDays}-day window (${pluralize(daysUntil, 'day')} away)`
                    : `\u274c Not yet within ${windowDays}-day window (${pluralize(daysUntil - windowDays, 'day')} remaining)`;
                const minDaysMsg = pastMinimum
                    ? `\u2705 At least ${minDays} days since last injection (${daysSince} days)`
                    : `\u274c Only ${pluralize(daysSince, 'day')} since last injection (${pluralize(minDays - daysSince, 'day')} remaining)`;
                resultHTML = earlyResultBox(
                    false,
                    '\u274c Too early to administer.',
                    `${windowMsg}<br>${minDaysMsg}`,
                );
            }
        } else if (hasMinDays) {
            const lastDate = val(LAST_INJECTION_DATE_ID);
            const daysSince = daysSinceDate(lastDate);
            const minDays = entry.earlyMinDays!;

            rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Last injection:', formatDate(lastDate));

            resultHTML = minDaysResult(daysSince, minDays);
        } else {
            const nextDate = val(NEXT_INJECTION_DATE_ID);
            const daysUntil = Math.max(0, -daysSinceDate(nextDate));
            const windowDays = entry.earlyDaysBeforeDue!;

            rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Next injection scheduled:', formatDate(nextDate));

            if (daysUntil === 0) {
                resultHTML = earlyResultBox(
                    true,
                    '\u2705 Administer today \u2014 the injection is scheduled for today.',
                );
            } else if (daysUntil <= windowDays) {
                resultHTML = earlyResultBox(
                    true,
                    '\u2705 Early administration is allowed.',
                    `The scheduled injection is <strong>${pluralize(daysUntil, 'day')}</strong> away, within the ${windowDays}-day early window.`,
                );
            } else {
                resultHTML = earlyResultBox(
                    false,
                    '\u274c Too early to administer.',
                    `The scheduled injection is <strong>${pluralize(daysUntil, 'day')}</strong> away. Early administration is permitted within <strong>${pluralize(windowDays, 'day')}</strong> of the scheduled date.`,
                );
            }
        }

        const notifs = [
            ...(entry.earlyProviderNotification ?? []),
            ...(entry.commonProviderNotifications ?? []),
        ];
        const body = `
        ${resultHTML}
        <div class="guidance-content no-box">
            <h3 class="guidance-heading">Early administration window:</h3>
            <div class="guidance-text">${md(entry.earlyGuidance)}</div>
        </div>
        ${buildNotifyBlock(notifs)}
        ${entry.optgroupLabel === ADDICTION_MEDICINE_LABEL ? addictionMedicineAccordion() : ''}`;

        injectGuidanceSection(rows, body);
    } catch (err) {
        console.error('[showEarlyGuidance] Unexpected error:', err);
        injectGuidanceSection(
            '',
            `<div class="guidance-content early-not-allowed"><p>⚠️ An internal error has occurred, please refer to protocol document for now.</p></div>`,
        );
    }
}
