// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { infoRow, threePartGuidance, injectGuidanceSection, addictionMedicineAccordion } from '../guidanceRenderer';

vi.stubGlobal('scrollTo', vi.fn());

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('infoRow', () => {
    it('returns HTML with label and value spans', () => {
        const html = infoRow('Medication:', 'Aristada');
        expect(html).toContain('info-label');
        expect(html).toContain('Medication:');
        expect(html).toContain('info-value');
        expect(html).toContain('Aristada');
    });

    it('wraps content in a div.info-row', () => {
        const html = infoRow('Key:', 'Val');
        expect(html).toContain('info-row');
    });
});

describe('threePartGuidance', () => {
    it('renders ideal steps with "Next steps:" when no pragmatic variations', () => {
        const html = threePartGuidance({ idealSteps: ['Give injection'] });
        expect(html).toContain('Next steps:');
        expect(html).toContain('Give injection');
        expect(html).not.toContain('pragmatic');
    });

    it('renders "Ideal steps:" and pragmatic block when pragmaticVariations present', () => {
        const html = threePartGuidance({
            idealSteps: ['Step 1'],
            pragmaticVariations: ['Variation A'],
        });
        expect(html).toContain('Ideal steps:');
        expect(html).toContain('Acceptable pragmatic variations');
        expect(html).toContain('Variation A');
    });

    it('renders tier-level providerNotifications as list items', () => {
        const html = threePartGuidance({
            idealSteps: ['Step'],
            providerNotifications: ['Notify about X'],
        });
        expect(html).toContain('<li>');
        expect(html).toContain('Notify about X');
        expect(html).not.toContain('No provider notification needed');
    });

    it('renders common notifications alongside tier notifications', () => {
        const html = threePartGuidance(
            { idealSteps: ['Step'], providerNotifications: ['Tier notif'] },
            ['Common notif'],
        );
        expect(html).toContain('Tier notif');
        expect(html).toContain('Common notif');
    });

    it('renders "No provider notification needed" when no notifications at all', () => {
        const html = threePartGuidance({ idealSteps: ['Step'] });
        expect(html).toContain('No provider notification needed');
    });

    it('omits addiction medicine accordion by default', () => {
        const html = threePartGuidance({ idealSteps: ['Step'] });
        expect(html).not.toContain('fpa-box');
    });

    it('includes addiction medicine accordion when isAddictionMed = true', () => {
        const html = threePartGuidance({ idealSteps: ['Step'] }, undefined, true);
        expect(html).toContain('fpa-box');
        expect(html).toContain('Addiction Medicine');
    });
});

describe('addictionMedicineAccordion', () => {
    it('renders details/summary elements for each definition', () => {
        const html = addictionMedicineAccordion();
        expect(html).toContain('<details');
        expect(html).toContain('<summary');
        expect(html).toContain('fpa-item');
    });

    it('contains the group title', () => {
        const html = addictionMedicineAccordion();
        expect(html).toContain('Addiction Medicine definitions');
    });
});

describe('injectGuidanceSection', () => {
    it('hides the form section and inserts guidance HTML before disclaimer', () => {
        document.body.innerHTML = `
            <div class="form-section" style="display:block;"></div>
            <div class="disclaimer"></div>
        `;
        injectGuidanceSection(infoRow('Med:', 'Test'), '<p>Body</p>');
        expect(document.querySelector<HTMLElement>('.form-section')!.style.display).toBe('none');
        expect(document.querySelector('.guidance-section')).not.toBeNull();
        expect(document.querySelector('.guidance-section')!.innerHTML).toContain('Body');
        expect(document.querySelector('.guidance-section')!.innerHTML).toContain('Med:');
    });

    it('includes a Start Over button', () => {
        document.body.innerHTML = `
            <div class="form-section"></div>
            <div class="disclaimer"></div>
        `;
        injectGuidanceSection('', '<p>content</p>');
        expect(document.querySelector('.guidance-section')!.innerHTML).toContain('Start Over');
    });
});
