import type { GuidanceResult } from '../interfaces/guidance';
import { md } from '../utils';
import { NO_PROVIDER_NOTIFICATION } from '../constants';
import DEFINITIONS from '../meds/definitions.json';
import { FORM_SECTION_SEL } from './domIds';

export function infoRow(label: string, value: string): string {
    return `
        <div class="info-row">
            <span class="info-label">${label}</span>
            <span class="info-value">${value}</span>
        </div>`;
}

export function addictionMedicineAccordion(): string {
    const phases = DEFINITIONS.addictionMedicine.definitions;

    const items = phases.map(p => {
        const body = p.allCriteria?.length
            ? `<p>Must meet ALL of the following:</p><ul>${p.allCriteria.map((c: string) => `<li>${c}</li>`).join('')}</ul>`
            : `<p>${(p as { description: string }).description}</p>`;
        return `
        <details class="fpa-item">
            <summary class="fpa-summary">${p.label}</summary>
            <div class="fpa-body">${body}</div>
        </details>`;
    }).join('');

    return `
        <div class="guidance-content fpa-box">
            <h3 class="guidance-heading">${DEFINITIONS.addictionMedicine.groupTitle} <span class="fpa-hint">(click to expand)</span></h3>
            ${items}
        </div>`;
}

export function threePartGuidance(guidance: GuidanceResult, common?: string[], isAddictionMed = false): string {
    const hasPragmatic = !!guidance.pragmaticVariations?.length;
    const idealTitle = hasPragmatic ? 'Ideal steps:' : 'Next steps:';
    const pragmaticBlock = hasPragmatic ? `
        <div class="guidance-content ideal-content">
            <h3 class="guidance-heading">Acceptable pragmatic variations (if ideal is not possible):</h3>
            <div class="guidance-text">${guidance.pragmaticVariations!.map(v => md(v)).join('')}</div>
        </div>` : '';
    const allNotifs = [...(guidance.providerNotifications ?? []), ...(common ?? [])];
    const phasesBlock = isAddictionMed ? addictionMedicineAccordion() : '';
    return `
        <div class="guidance-content ideal-content">
            <h3 class="guidance-heading">${idealTitle}</h3>
            <div class="guidance-text">${md(guidance.idealSteps)}</div>
        </div>${pragmaticBlock}
        <div class="guidance-content no-box">
            <h3 class="guidance-heading">When to notify provider:</h3>
            ${allNotifs.length
            ? `<ul>${allNotifs.map(n => `<li>${md(n)}</li>`).join('')}</ul>`
            : `<div class="guidance-text">${md(NO_PROVIDER_NOTIFICATION)}</div>`}
        </div>${phasesBlock}`;
}

export function injectGuidanceSection(infoRows: string, bodyHTML: string): void {
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
