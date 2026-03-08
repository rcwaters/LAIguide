// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    handleMedicationChange,
    handleGuidanceTypeChange,
    handleInvegaTypeChange,
    handleSubmit,
    startOver,
    initForm,
} from '../app';

// ─── jsdom stubs ──────────────────────────────────────────────────────────────

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
window.alert    = vi.fn();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');

function setupDOM(): void {
    document.documentElement.innerHTML = HTML;
    initForm();
}

function setField(id: string, value: string): void {
    (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = value;
}

function isVisible(id: string): boolean {
    return document.getElementById(id)!.style.display !== 'none';
}

/** Returns a YYYY-MM-DD string for a date N days in the past using local time (avoids UTC off-by-one). */
function daysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ─── handleGuidanceTypeChange — field visibility ──────────────────────────────

describe('handleGuidanceTypeChange', () => {
    beforeEach(setupDOM);

    const medFields: [string, string][] = [
        ['invega_sustenna',  'invega-sustenna-options'],
        ['invega_trinza',    'trinza-fields'],
        ['invega_hafyera',   'hafyera-fields'],
        ['abilify_maintena', 'abilify-fields'],
        ['aristada',         'aristada-fields'],
        ['uzedy',            'uzedy-fields'],
    ];

    test.each(medFields)(
        '%s + late → shows %s',
        (medication, fieldId) => {
            setField('medication', medication);
            setField('guidance-type', 'late');
            handleGuidanceTypeChange();
            expect(isVisible(fieldId)).toBe(true);
        },
    );

    test.each(medFields)(
        '%s + early → hides %s',
        (medication, fieldId) => {
            setField('medication', medication);
            setField('guidance-type', 'early');
            handleGuidanceTypeChange();
            expect(isVisible(fieldId)).toBe(false);
        },
    );

    test('switching from invega_sustenna to another medication hides invega options', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        handleGuidanceTypeChange();
        expect(isVisible('invega-sustenna-options')).toBe(true);

        setField('medication', 'uzedy');
        handleMedicationChange();
        expect(isVisible('invega-sustenna-options')).toBe(false);
        expect(isVisible('uzedy-fields')).toBe(true);
    });

    test('medications without late guidance (e.g. vivitrol) show no conditional fields', () => {
        setField('medication', 'vivitrol');
        setField('guidance-type', 'late');
        handleGuidanceTypeChange();
        medFields.forEach(([, fieldId]) => {
            expect(isVisible(fieldId)).toBe(false);
        });
    });
});

// ─── handleInvegaTypeChange ───────────────────────────────────────────────────

describe('handleInvegaTypeChange', () => {
    beforeEach(() => {
        setupDOM();
        setField('medication', 'invega_sustenna');
    });

    test('initiation → shows first-injection-date, hides maintenance-fields', () => {
        setField('invega-type', 'initiation');
        handleInvegaTypeChange();
        expect(isVisible('first-injection-date')).toBe(true);
        expect(isVisible('maintenance-fields')).toBe(false);
    });

    test('maintenance → shows maintenance-fields, hides first-injection-date', () => {
        setField('invega-type', 'maintenance');
        handleInvegaTypeChange();
        expect(isVisible('maintenance-fields')).toBe(true);
        expect(isVisible('first-injection-date')).toBe(false);
    });

    test('switching from initiation to maintenance clears first-injection field', () => {
        setField('invega-type', 'initiation');
        handleInvegaTypeChange();
        setField('first-injection', daysAgo(10));

        setField('invega-type', 'maintenance');
        handleInvegaTypeChange();
        expect((document.getElementById('first-injection') as HTMLInputElement).value).toBe('');
    });

    test('switching from maintenance to initiation clears last-maintenance and dose fields', () => {
        setField('invega-type', 'maintenance');
        handleInvegaTypeChange();
        setField('last-maintenance', daysAgo(35));
        setField('maintenance-dose', '234');

        setField('invega-type', 'initiation');
        handleInvegaTypeChange();
        expect((document.getElementById('last-maintenance') as HTMLInputElement).value).toBe('');
        expect((document.getElementById('maintenance-dose') as HTMLSelectElement).value).toBe('');
    });
});

// ─── handleSubmit — form validation ──────────────────────────────────────────

describe('handleSubmit — validation', () => {
    beforeEach(() => {
        setupDOM();
        vi.mocked(window.alert).mockClear();
    });

    test('alerts when no medication selected', () => {
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select a medication.');
    });

    test('alerts when no guidance type selected', () => {
        setField('medication', 'uzedy');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select a guidance type.');
    });

    test('invega_sustenna + late: alerts when no invega type selected', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the Invega Sustenna injection type.');
    });

    test('invega_sustenna + initiation: alerts when no date entered', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        setField('invega-type', 'initiation');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of first (234 mg) injection.');
    });

    test('invega_sustenna + maintenance: alerts when no date entered', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        setField('invega-type', 'maintenance');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last maintenance injection.');
    });

    test('invega_sustenna + maintenance: alerts when no dose selected', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        setField('invega-type', 'maintenance');
        setField('last-maintenance', daysAgo(35));
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the monthly maintenance injection dose.');
    });

    test('invega_trinza + late: alerts when no date entered', () => {
        setField('medication', 'invega_trinza');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last Trinza injection.');
    });

    test('invega_trinza + late: alerts when no dose selected', () => {
        setField('medication', 'invega_trinza');
        setField('guidance-type', 'late');
        setField('last-trinza', daysAgo(100));
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the Trinza injection dose.');
    });

    test('invega_hafyera + late: alerts when no date entered', () => {
        setField('medication', 'invega_hafyera');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last Hafyera injection.');
    });

    test('abilify_maintena + late: alerts when no date entered', () => {
        setField('medication', 'abilify_maintena');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last Abilify Maintena injection.');
    });

    test('abilify_maintena + late: alerts when no prior doses selected', () => {
        setField('medication', 'abilify_maintena');
        setField('guidance-type', 'late');
        setField('last-abilify', daysAgo(35));
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the number of prior consecutive monthly injections.');
    });

    test('aristada + late: alerts when no date entered', () => {
        setField('medication', 'aristada');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last Aristada injection.');
    });

    test('aristada + late: alerts when no dose selected', () => {
        setField('medication', 'aristada');
        setField('guidance-type', 'late');
        setField('last-aristada', daysAgo(50));
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the dose of last Aristada injection.');
    });

    test('uzedy + late: alerts when no date entered', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'late');
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please enter the date of last Uzedy injection.');
    });

    test('uzedy + late: alerts when no dose selected', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'late');
        setField('last-uzedy', daysAgo(35));
        handleSubmit();
        expect(window.alert).toHaveBeenCalledWith('Please select the Uzedy maintenance dose.');
    });
});

// ─── handleSubmit — guidance rendering ───────────────────────────────────────

describe('handleSubmit — guidance rendering', () => {
    beforeEach(() => {
        setupDOM();
        vi.mocked(window.alert).mockClear();
    });

    function expectGuidanceRendered(): void {
        expect(document.querySelector('.guidance-section')).not.toBeNull();
        expect(document.querySelector<HTMLElement>('.form-section')!.style.display).toBe('none');
    }

    test('early guidance: renders guidance section and hides form', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'early');
        handleSubmit();
        expectGuidanceRendered();
        expect(window.alert).not.toHaveBeenCalled();
    });

    test('early guidance: shows medication name in output', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'early');
        handleSubmit();
        expect(document.body.innerHTML).toContain('Uzedy (risperidone subcutaneous)');
    });

    test('invega sustenna initiation: renders guidance section', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        setField('invega-type', 'initiation');
        setField('first-injection', daysAgo(30));
        handleSubmit();
        expectGuidanceRendered();
    });

    test('invega sustenna maintenance: renders guidance section', () => {
        setField('medication', 'invega_sustenna');
        setField('guidance-type', 'late');
        setField('invega-type', 'maintenance');
        setField('last-maintenance', daysAgo(50));
        setField('maintenance-dose', '234');
        handleSubmit();
        expectGuidanceRendered();
    });

    test('invega trinza: renders guidance section', () => {
        setField('medication', 'invega_trinza');
        setField('guidance-type', 'late');
        setField('last-trinza', daysAgo(100));
        setField('trinza-dose', '546');
        handleSubmit();
        expectGuidanceRendered();
    });

    test('invega hafyera: renders guidance section', () => {
        setField('medication', 'invega_hafyera');
        setField('guidance-type', 'late');
        setField('last-hafyera', daysAgo(190));
        handleSubmit();
        expectGuidanceRendered();
    });

    test('abilify maintena: renders guidance section', () => {
        setField('medication', 'abilify_maintena');
        setField('guidance-type', 'late');
        setField('last-abilify', daysAgo(35));
        setField('abilify-doses', '3+');
        handleSubmit();
        expectGuidanceRendered();
    });

    test('aristada: renders guidance section', () => {
        setField('medication', 'aristada');
        setField('guidance-type', 'late');
        setField('last-aristada', daysAgo(50));
        setField('aristada-dose', '662');
        handleSubmit();
        expectGuidanceRendered();
    });

    test('uzedy: renders guidance section', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'late');
        setField('last-uzedy', daysAgo(35));
        setField('uzedy-dose', '150-or-less');
        handleSubmit();
        expectGuidanceRendered();
    });

    test('guidance section includes a Start Over button', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'early');
        handleSubmit();
        const btn = document.querySelector('.guidance-section button');
        expect(btn).not.toBeNull();
        expect(btn!.textContent).toBe('Start Over');
    });
});

// ─── startOver ────────────────────────────────────────────────────────────────

describe('startOver', () => {
    beforeEach(setupDOM);

    test('restores the form section and removes guidance section', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'early');
        handleSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();

        startOver();
        expect(document.querySelector('.guidance-section')).toBeNull();
        expect(document.querySelector<HTMLElement>('.form-section')!.style.display).toBe('block');
    });

    test('clears all form fields', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'late');
        setField('last-uzedy', daysAgo(35));
        setField('uzedy-dose', '150-or-less');

        startOver();

        expect((document.getElementById('medication')       as HTMLSelectElement).value).toBe('');
        expect((document.getElementById('guidance-type')    as HTMLSelectElement).value).toBe('');
        expect((document.getElementById('last-uzedy')       as HTMLInputElement).value).toBe('');
        expect((document.getElementById('uzedy-dose')       as HTMLSelectElement).value).toBe('');
    });

    test('hides all conditional field groups', () => {
        setField('medication', 'uzedy');
        setField('guidance-type', 'late');
        handleGuidanceTypeChange();
        expect(isVisible('uzedy-fields')).toBe(true);

        startOver();
        expect(isVisible('uzedy-fields')).toBe(false);
    });
});
