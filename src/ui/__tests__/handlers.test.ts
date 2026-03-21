// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initForm } from '../formInit';
import {
    handleGuidanceTypeChange,
    selectGuidanceType,
    startOver,
    handleSubmit,
    checkAutoSubmit,
} from '../handlers';

vi.stubGlobal('scrollTo', vi.fn());
vi.stubGlobal('alert', vi.fn());

function localDaysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromNow(n: number): string {
    return localDaysAgo(-n);
}

function setVal(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = value;
}

function setupBaseDOM(): void {
    document.body.innerHTML = `
        <select id="medication"></select>
        <input type="hidden" id="guidance-type" value="" />
        <div id="guidance-type-group" style="display:none"></div>
        <div id="start-over-bar" style="display:none"></div>
        <div class="form-section" style="display:block;"></div>
        <div class="disclaimer"></div>
        <button class="seg-btn" data-value="early">Early</button>
        <button class="seg-btn" data-value="late">Late</button>
    `;
    initForm();
}

// ── selectGuidanceType ────────────────────────────────────────────────────────

describe('selectGuidanceType', () => {
    beforeEach(setupBaseDOM);

    it('sets the hidden guidance-type input value', () => {
        // Medication must be set first — handleGuidanceTypeChange clears guidance-type when no med selected
        setVal('medication', 'abilify_maintena');
        selectGuidanceType('early');
        expect((document.getElementById('guidance-type') as HTMLInputElement).value).toBe('early');
    });

    it('sets late value correctly', () => {
        setVal('medication', 'abilify_maintena');
        selectGuidanceType('late');
        expect((document.getElementById('guidance-type') as HTMLInputElement).value).toBe('late');
    });

    it('adds seg-btn--active to the correct button and removes from others', () => {
        selectGuidanceType('late');
        const buttons = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-value]');
        const lateBtn = [...buttons].find((b) => b.dataset.value === 'late');
        const earlyBtn = [...buttons].find((b) => b.dataset.value === 'early');
        expect(lateBtn?.classList.contains('seg-btn--active')).toBe(true);
        expect(earlyBtn?.classList.contains('seg-btn--active')).toBe(false);
    });

    it('switches active class when called again with different value', () => {
        selectGuidanceType('late');
        selectGuidanceType('early');
        const buttons = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-value]');
        const earlyBtn = [...buttons].find((b) => b.dataset.value === 'early');
        const lateBtn = [...buttons].find((b) => b.dataset.value === 'late');
        expect(earlyBtn?.classList.contains('seg-btn--active')).toBe(true);
        expect(lateBtn?.classList.contains('seg-btn--active')).toBe(false);
    });
});

// ── handleGuidanceTypeChange ──────────────────────────────────────────────────

describe('handleGuidanceTypeChange', () => {
    beforeEach(setupBaseDOM);

    it('hides guidance-type-group when no medication is selected', () => {
        setVal('medication', '');
        handleGuidanceTypeChange();
        expect(document.getElementById('guidance-type-group')!.style.display).toBe('none');
    });

    it('shows guidance-type-group when a medication is selected', () => {
        setVal('medication', 'abilify_maintena');
        handleGuidanceTypeChange();
        expect(document.getElementById('guidance-type-group')!.style.display).toBe('block');
    });

    it('shows early-last-date-group for earlyMinDays-only med (abilify_maintena) with early type', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'early');
        handleGuidanceTypeChange();
        expect(document.getElementById('early-last-date-group')!.style.display).toBe('block');
        expect(document.getElementById('early-date-group')!.style.display).toBe('none');
    });

    it('shows early-date-group for window-only med (invega_trinza) with early type', () => {
        setVal('medication', 'invega_trinza');
        setVal('guidance-type', 'early');
        handleGuidanceTypeChange();
        expect(document.getElementById('early-date-group')!.style.display).toBe('block');
        expect(document.getElementById('early-last-date-group')!.style.display).toBe('none');
    });

    it('shows both date groups for dual-constraint med (aristada) with early type', () => {
        setVal('medication', 'aristada');
        setVal('guidance-type', 'early');
        handleGuidanceTypeChange();
        expect(document.getElementById('early-date-group')!.style.display).toBe('block');
        expect(document.getElementById('early-last-date-group')!.style.display).toBe('block');
    });

    it('shows lateFieldsGroup for late guidance (abilify_maintena)', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        handleGuidanceTypeChange();
        expect(document.getElementById('abilify-fields')!.style.display).toBe('block');
    });

    it('hides date groups when guidance type is late', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        handleGuidanceTypeChange();
        expect(document.getElementById('early-date-group')!.style.display).toBe('none');
        expect(document.getElementById('early-last-date-group')!.style.display).toBe('none');
    });

    it('hides previous med field group when switching medications', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        handleGuidanceTypeChange();
        expect(document.getElementById('abilify-fields')!.style.display).toBe('block');

        setVal('medication', 'vivitrol');
        handleGuidanceTypeChange();
        expect(document.getElementById('abilify-fields')!.style.display).toBe('none');
    });
});

// ── startOver ─────────────────────────────────────────────────────────────────

describe('startOver', () => {
    beforeEach(setupBaseDOM);

    it('removes the guidance section from the DOM', () => {
        document.querySelector('.disclaimer')!.insertAdjacentHTML(
            'beforebegin',
            '<div class="guidance-section"><p>Some guidance</p></div>',
        );
        expect(document.querySelector('.guidance-section')).not.toBeNull();
        startOver();
        expect(document.querySelector('.guidance-section')).toBeNull();
    });

    it('restores the form section to visible', () => {
        document.querySelector<HTMLElement>('.form-section')!.style.display = 'none';
        startOver();
        expect(document.querySelector<HTMLElement>('.form-section')!.style.display).toBe('block');
    });

    it('clears the medication selection', () => {
        setVal('medication', 'abilify_maintena');
        startOver();
        expect((document.getElementById('medication') as HTMLSelectElement).value).toBe('');
    });

    it('hides the guidance-type-group', () => {
        document.getElementById('guidance-type-group')!.style.display = 'block';
        startOver();
        expect(document.getElementById('guidance-type-group')!.style.display).toBe('none');
    });

    it('removes seg-btn--active class from all buttons', () => {
        document
            .querySelectorAll<HTMLButtonElement>('.seg-btn')
            .forEach((b) => b.classList.add('seg-btn--active'));
        startOver();
        const active = document.querySelectorAll('.seg-btn--active');
        expect(active.length).toBe(0);
    });

    it('does not throw when no guidance section exists', () => {
        expect(() => startOver()).not.toThrow();
    });
});

// ── handleSubmit ──────────────────────────────────────────────────────────────

describe('handleSubmit', () => {
    beforeEach(setupBaseDOM);

    it('injects guidance section for early guidance (abilify_maintena)', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'early');
        setVal('last-injection-date', localDaysAgo(30));
        handleSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();
    });

    it('injects guidance section for late guidance (abilify_maintena)', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        setVal('last-abilify', localDaysAgo(35));
        setVal('abilify-prior-dose-group', '3+');
        handleSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();
    });

    it('hides form-section after rendering guidance', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        setVal('last-abilify', localDaysAgo(35));
        setVal('abilify-prior-dose-group', '3+');
        handleSubmit();
        expect(document.querySelector<HTMLElement>('.form-section')!.style.display).toBe('none');
    });

    it('renders medication name in the guidance section', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        setVal('last-abilify', localDaysAgo(35));
        setVal('abilify-prior-dose-group', '3+');
        handleSubmit();
        expect(document.querySelector('.guidance-section')!.innerHTML).toContain('Abilify Maintena');
    });

    it('injects guidance for early window-only med (invega_trinza)', () => {
        setVal('medication', 'invega_trinza');
        setVal('guidance-type', 'early');
        setVal('next-injection-date', daysFromNow(3));
        handleSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();
    });
});

// ── checkAutoSubmit ───────────────────────────────────────────────────────────

describe('checkAutoSubmit', () => {
    beforeEach(setupBaseDOM);

    it('does not submit when no medication selected', () => {
        setVal('medication', '');
        setVal('guidance-type', 'early');
        checkAutoSubmit();
        expect(document.querySelector('.guidance-section')).toBeNull();
    });

    it('does not submit when guidance type not selected', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', '');
        checkAutoSubmit();
        expect(document.querySelector('.guidance-section')).toBeNull();
    });

    it('does not re-submit when guidance section already exists', () => {
        document.querySelector('.disclaimer')!.insertAdjacentHTML(
            'beforebegin',
            '<div class="guidance-section"><p>Existing</p></div>',
        );
        // Should return early without error
        expect(() => checkAutoSubmit()).not.toThrow();
        // Still only one guidance section
        expect(document.querySelectorAll('.guidance-section').length).toBe(1);
    });

    it('does not submit early guidance when required date is missing (abilify_maintena)', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'early');
        setVal('last-injection-date', '');
        checkAutoSubmit();
        expect(document.querySelector('.guidance-section')).toBeNull();
    });

    it('auto-submits early guidance when all fields are filled (abilify_maintena)', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'early');
        setVal('last-injection-date', localDaysAgo(30));
        checkAutoSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();
    });

    it('auto-submits late guidance when all visible inputs are filled', () => {
        setVal('medication', 'abilify_maintena');
        setVal('guidance-type', 'late');
        // Show abilify-fields so checkAutoSubmit inspects its inputs
        document.getElementById('abilify-fields')!.style.display = 'block';
        setVal('last-abilify', localDaysAgo(35));
        setVal('abilify-prior-dose-group', '3+');
        checkAutoSubmit();
        expect(document.querySelector('.guidance-section')).not.toBeNull();
    });
});
