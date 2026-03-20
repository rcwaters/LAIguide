// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderDefinitionsForm, reindexDefinitionPaths } from '../forms/definitionsForm';

const sampleData = {
    addictionMedicine: {
        groupTitle: 'Addiction Medicine definitions',
        definitions: [
            {
                label: 'Minimal or no fentanyl dependence',
                allCriteria: ['Criterion A', 'Criterion B'],
            },
            {
                label: 'Moderate fentanyl dependence',
                description: 'Defined as between categories.',
            },
        ],
    },
};

let container: HTMLDivElement;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
});

describe('renderDefinitionsForm', () => {
    it('clears previous content before rendering', () => {
        container.innerHTML = '<p>old</p>';
        renderDefinitionsForm(container, sampleData);
        expect(container.querySelector('p')).toBeNull();
    });

    it('renders a group title text input with correct value', () => {
        renderDefinitionsForm(container, sampleData);
        const input = container.querySelector<HTMLInputElement>(
            'input[data-path="addictionMedicine.groupTitle"]',
        );
        expect(input).not.toBeNull();
        expect(input?.value).toBe('Addiction Medicine definitions');
    });

    it('renders a definition block for each definition', () => {
        renderDefinitionsForm(container, sampleData);
        const blocks = container.querySelectorAll('.definition-block');
        expect(blocks.length).toBe(2);
    });

    it('renders label input with correct value for first definition', () => {
        renderDefinitionsForm(container, sampleData);
        const input = container.querySelector<HTMLInputElement>(
            'input[data-path="addictionMedicine.definitions.0.label"]',
        );
        expect(input?.value).toBe('Minimal or no fentanyl dependence');
    });

    it('renders allCriteria list editor items for first definition', () => {
        renderDefinitionsForm(container, sampleData);
        const listEditor = container.querySelector<HTMLDivElement>(
            '[data-path="addictionMedicine.definitions.0.allCriteria"]',
        );
        expect(listEditor).not.toBeNull();
        const textareas = listEditor!.querySelectorAll<HTMLTextAreaElement>('.list-item textarea');
        expect(textareas.length).toBe(2);
        expect(textareas[0].value).toBe('Criterion A');
        expect(textareas[1].value).toBe('Criterion B');
    });

    it('renders description input for second definition', () => {
        renderDefinitionsForm(container, sampleData);
        const input = container.querySelector<HTMLInputElement>(
            'input[data-path="addictionMedicine.definitions.1.description"]',
        );
        expect(input?.value).toBe('Defined as between categories.');
    });

    it('updates the .tier-label-text span in real-time when the label input changes', () => {
        renderDefinitionsForm(container, sampleData);
        const labelInput = container.querySelector<HTMLInputElement>(
            'input[data-path="addictionMedicine.definitions.0.label"]',
        )!;
        const block = labelInput.closest('.definition-block')!;
        const labelSpan = block.querySelector<HTMLElement>('.tier-label-text')!;

        labelInput.value = 'New Label Text';
        labelInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(labelSpan.textContent).toBe('New Label Text');
    });

    it('skips top-level keys that are not objects or have no groupTitle', () => {
        const data = {
            ...sampleData,
            nullValue: null,
            stringValue: 'hello',
            noTitle: { definitions: [] },
        } as Record<string, unknown>;
        renderDefinitionsForm(container, data);
        // Only the valid group should produce a section
        const inputs = container.querySelectorAll('input[data-path$=".groupTitle"]');
        expect(inputs.length).toBe(1);
    });
});

describe('reindexDefinitionPaths', () => {
    it('rewrites data-path indices to match new DOM order after a simulated reorder', () => {
        renderDefinitionsForm(container, sampleData);
        const listContainer = container.querySelector<HTMLElement>('.definitions-list')!;
        const blocks = Array.from(listContainer.querySelectorAll('.definition-block'));

        // Move first block to end (swap order)
        listContainer.appendChild(blocks[0]);

        reindexDefinitionPaths(listContainer, 'addictionMedicine');

        // The block now at index 0 should have paths with index 0
        const newFirst = listContainer.querySelector('.definition-block')!;
        const pathEls = newFirst.querySelectorAll<HTMLElement>('[data-path]');
        pathEls.forEach((el) => {
            expect(el.dataset.path).toMatch(/addictionMedicine\.definitions\.0/);
        });

        // The block now at index 1 should have paths with index 1
        const newSecond = listContainer.querySelectorAll('.definition-block')[1]!;
        const pathEls2 = newSecond.querySelectorAll<HTMLElement>('[data-path]');
        pathEls2.forEach((el) => {
            expect(el.dataset.path).toMatch(/addictionMedicine\.definitions\.1/);
        });
    });

    it('updates the .tier-label-text span content to the current label input value', () => {
        renderDefinitionsForm(container, sampleData);
        const listContainer = container.querySelector<HTMLElement>('.definitions-list')!;

        // Change the label input value before reindexing
        const labelInput = listContainer.querySelector<HTMLInputElement>(
            'input[data-path$=".label"]',
        )!;
        labelInput.value = 'Updated Label';

        reindexDefinitionPaths(listContainer, 'addictionMedicine');

        const firstBlock = listContainer.querySelector('.definition-block')!;
        const span = firstBlock.querySelector<HTMLElement>('.tier-label-text')!;
        expect(span.textContent).toBe('Updated Label');
    });

    it('falls back to Definition N label when label input is empty', () => {
        renderDefinitionsForm(container, sampleData);
        const listContainer = container.querySelector<HTMLElement>('.definitions-list')!;

        const labelInput = listContainer.querySelector<HTMLInputElement>(
            'input[data-path$=".label"]',
        )!;
        labelInput.value = '';

        reindexDefinitionPaths(listContainer, 'addictionMedicine');

        const firstBlock = listContainer.querySelector('.definition-block')!;
        const span = firstBlock.querySelector<HTMLElement>('.tier-label-text')!;
        expect(span.textContent).toBe('Definition 1');
    });
});
