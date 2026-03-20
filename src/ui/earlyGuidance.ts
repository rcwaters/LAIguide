import type { MedicationKey } from '../interfaces/med';
import { MED_REGISTRY } from '../medLoader';
import { md, daysSinceDate, formatDate } from '../utils';
import { val } from './domHelpers';
import { NEXT_INJECTION_DATE_ID, LAST_INJECTION_DATE_ID, EARLY_GUIDANCE_LABEL } from './domIds';
import { infoRow, addictionMedicineAccordion, injectGuidanceSection } from './guidanceRenderer';

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
                const body = `
                <div class="guidance-content early-not-allowed">
                    <p>ℹ️ ${varDef.noGuidanceMessage}</p>
                </div>`;
                injectGuidanceSection(rows, body);
                return;
            }

            const lastDate = val(entry.earlyDateField ?? LAST_INJECTION_DATE_ID);
            const daysSince = daysSinceDate(lastDate);
            const minDays = varDef?.minDays ?? entry.earlyMinDays!;
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
            <div class="guidance-content no-box">
                <h3 class="guidance-heading">Early administration window:</h3>
                <div class="guidance-text">${md(entry.earlyGuidance)}</div>
            </div>
            ${(() => {
                const combined = [
                    ...(entry.earlyProviderNotification ?? []),
                    ...(entry.commonProviderNotifications ?? []),
                ];
                return combined.length
                    ? `<div class="guidance-content notify-box">
                    <h3 class="guidance-heading">When to notify provider:</h3>
                    <ul>${combined.map((n) => `<li>${md(n)}</li>`).join('')}</ul>
                </div>`
                    : '';
            })()}
            ${entry.optgroupLabel === 'Addiction Medicine' ? addictionMedicineAccordion() : ''}`;

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
                resultHTML = `<div class="guidance-content early-allowed">
                <strong>\u2705 Early administration is allowed.</strong>
                <p>Both criteria are met: the scheduled injection is <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong> away (within ${windowDays}-day window), and it has been <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> since the last injection (minimum: ${minDays} days).</p>
            </div>`;
            } else {
                const windowMsg = withinWindow
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
            const lastDate = val(LAST_INJECTION_DATE_ID);
            const daysSince = daysSinceDate(lastDate);
            const minDays = entry.earlyMinDays!;

            rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Last injection:', formatDate(lastDate));

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
            const nextDate = val(NEXT_INJECTION_DATE_ID);
            const daysUntil = Math.max(0, -daysSinceDate(nextDate));
            const windowDays = entry.earlyDaysBeforeDue!;

            rows =
                infoRow('Medication:', entry.displayName) +
                infoRow('Guidance Type:', EARLY_GUIDANCE_LABEL) +
                infoRow('Next injection scheduled:', formatDate(nextDate));

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
        <div class="guidance-content no-box">
            <h3 class="guidance-heading">Early administration window:</h3>
            <div class="guidance-text">${md(entry.earlyGuidance)}</div>
        </div>
        ${(() => {
            const combined = [
                ...(entry.earlyProviderNotification ?? []),
                ...(entry.commonProviderNotifications ?? []),
            ];
            return combined.length
                ? `<div class="guidance-content notify-box">
                <h3 class="guidance-heading">When to notify provider:</h3>
                <ul>${combined.map((n) => `<li>${md(n)}</li>`).join('')}</ul>
            </div>`
                : '';
        })()}
        ${entry.optgroupLabel === 'Addiction Medicine' ? addictionMedicineAccordion() : ''}`;

        injectGuidanceSection(rows, body);
    } catch (err) {
        console.error('[showEarlyGuidance] Unexpected error:', err);
        const errorBody = `<div class="guidance-content early-not-allowed">
            <p>⚠️ An internal error has occurred, please refer to protocol document for now.</p>
        </div>`;
        injectGuidanceSection('', errorBody);
    }
}
