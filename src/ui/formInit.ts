import type { FormGroupSpec, FieldSpec } from '../interfaces/med';
import { MED_REGISTRY } from '../medLoader';
import {
    MEDICATION_ID,
    FORM_SECTION_SEL,
    EARLY_DATE_GROUP_ID,
    EARLY_LAST_DATE_GROUP_ID,
    NEXT_INJECTION_DATE_ID,
    LAST_INJECTION_DATE_ID,
} from './domIds';

function renderField(f: FieldSpec, today: string): string {
    const label = `<label for="${f.id}">${f.label} <span class="required">*</span></label>`;
    if (f.type === 'date') {
        return `${label}\n<input type="date" id="${f.id}" class="date-input" max="${today}" placeholder="Pick or type a date" onchange="checkAutoSubmit()">`;
    }
    const onchange = f.onchange ? ` onchange="${f.onchange}"` : ' onchange="checkAutoSubmit()"';
    const opts = f.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('\n');
    return `${label}\n<select id="${f.id}"${onchange}>\n<option value="">${f.placeholder ?? 'Select...'}</option>\n${opts}\n</select>`;
}

function renderFieldGroup(spec: FormGroupSpec, today: string): string {
    const fields = spec.fields
        .map((f, i) =>
            i === 0
                ? renderField(f, today)
                : `<div style="margin-top: 15px;">${renderField(f, today)}</div>`,
        )
        .join('\n');
    return `<div class="input-group" id="${spec.groupId}" style="display: none;">\n${fields}\n</div>`;
}

export function initForm(): void {
    try {
        const medSelect = document.getElementById(MEDICATION_ID) as HTMLSelectElement | null;
        if (!medSelect) return;
        if (document.getElementById('uzedy-fields')) return;

        const groups = new Map<string, string[]>();
        for (const [key, entry] of Object.entries(MED_REGISTRY)) {
            if (!groups.has(entry.optgroupLabel)) groups.set(entry.optgroupLabel, []);
            groups
                .get(entry.optgroupLabel)!
                .push(`<option value="${key}">${entry.displayName}</option>`);
        }
        const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
            if (a === 'Addiction Medicine') return -1;
            if (b === 'Addiction Medicine') return 1;
            return a.localeCompare(b);
        });
        let optHtml = '<option value="">Select medication...</option>';
        for (const [groupLabel, opts] of sortedGroups) {
            optHtml += `<optgroup label="${groupLabel}">${opts.join('')}</optgroup>`;
        }
        medSelect.innerHTML = optHtml;

        const today = new Date().toISOString().split('T')[0];
        const formSection = document.querySelector<HTMLElement>(FORM_SECTION_SEL)!;
        const groupsHtml = Object.values(MED_REGISTRY)
            .flatMap((e) => e.formGroupsSpec)
            .map((spec) => renderFieldGroup(spec, today))
            .join('\n');
        formSection.insertAdjacentHTML('beforeend', groupsHtml);
        formSection.insertAdjacentHTML(
            'beforeend',
            `<div class="input-group" id="${EARLY_DATE_GROUP_ID}" style="display: none;">
<label for="${NEXT_INJECTION_DATE_ID}">Next injection scheduled <span class="required">*</span></label>
<input type="date" id="${NEXT_INJECTION_DATE_ID}" class="date-input" min="${today}" placeholder="Pick or type a date" onchange="checkAutoSubmit()">
</div>`,
        );

        formSection.insertAdjacentHTML(
            'beforeend',
            `<div class="input-group" id="${EARLY_LAST_DATE_GROUP_ID}" style="display: none;">
<label for="${LAST_INJECTION_DATE_ID}">Date of last injection <span class="required">*</span></label>
<input type="date" id="${LAST_INJECTION_DATE_ID}" class="date-input" max="${today}" placeholder="Pick or type a date" onchange="checkAutoSubmit()">
</div>`,
        );
    } catch (err) {
        console.error('[initForm] Unexpected error:', err);
    }
}
