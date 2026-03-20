// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
    createEl,
    makeSection,
    makeTextInput,
    makeComboInput,
    makeNumberInput,
    makeListEditor,
    collectFormData,
} from '../forms/helpers';

describe('createEl', () => {
    it('creates an element with the correct tag', () => {
        const el = createEl('span');
        expect(el.tagName.toLowerCase()).toBe('span');
    });

    it('sets attributes on the element', () => {
        const el = createEl('input', { type: 'text', 'data-path': 'foo.bar' });
        expect(el.getAttribute('type')).toBe('text');
        expect(el.getAttribute('data-path')).toBe('foo.bar');
    });

    it('sets textContent via the special textContent key and not as an attribute', () => {
        const el = createEl('span', { textContent: 'Hello' });
        expect(el.textContent).toBe('Hello');
        expect(el.hasAttribute('textContent')).toBe(false);
    });

    it('appends children', () => {
        const child = document.createElement('span');
        child.textContent = 'child';
        const el = createEl('div', {}, [child, 'text node']);
        expect(el.children.length).toBe(1);
        expect(el.textContent).toContain('child');
        expect(el.textContent).toContain('text node');
    });
});

describe('makeSection', () => {
    it('renders a section with the correct title text', () => {
        const { section } = makeSection('My Section');
        expect(section.textContent).toContain('My Section');
    });

    it('starts expanded by default', () => {
        const { section } = makeSection('Expanded');
        expect(section.classList.contains('collapsed')).toBe(false);
    });

    it('starts collapsed when collapsed=true is passed', () => {
        const { section } = makeSection('Collapsed', true);
        expect(section.classList.contains('collapsed')).toBe(true);
    });

    it('toggles collapsed class on header click', () => {
        const { section } = makeSection('Toggle');
        const header = section.querySelector<HTMLElement>('.form-section-header')!;
        expect(section.classList.contains('collapsed')).toBe(false);
        header.click();
        expect(section.classList.contains('collapsed')).toBe(true);
        header.click();
        expect(section.classList.contains('collapsed')).toBe(false);
    });
});

describe('makeTextInput', () => {
    it('renders a label with correct text', () => {
        const row = makeTextInput('My Label', 'value', 'some.path');
        const label = row.querySelector('label')!;
        expect(label.textContent).toBe('My Label');
    });

    it('renders an input with correct value and data-path', () => {
        const row = makeTextInput('Label', 'the-value', 'a.b.c');
        const input = row.querySelector<HTMLInputElement>('input')!;
        expect(input.value).toBe('the-value');
        expect(input.dataset.path).toBe('a.b.c');
    });
});

describe('makeNumberInput', () => {
    it('renders an input with type number and correct value', () => {
        const row = makeNumberInput('Count', 42, 'count.path');
        const input = row.querySelector<HTMLInputElement>('input')!;
        expect(input.type).toBe('number');
        expect(input.value).toBe('42');
    });

    it('renders empty string for null value', () => {
        const row = makeNumberInput('Count', null, 'count.path');
        const input = row.querySelector<HTMLInputElement>('input')!;
        expect(input.value).toBe('');
    });
});

describe('makeComboInput', () => {
    it('renders a label with correct text', () => {
        const row = makeComboInput('My Group', 'val', 'path', ['A'], 'list-1');
        expect(row.querySelector('label')?.textContent).toBe('My Group');
    });

    it('renders an input with the correct value and data-path', () => {
        const row = makeComboInput(
            'Group',
            'Antipsychotics',
            'optgroupLabel',
            ['Antipsychotics'],
            'list-2',
        );
        const input = row.querySelector<HTMLInputElement>('input')!;
        expect(input.value).toBe('Antipsychotics');
        expect(input.dataset.path).toBe('optgroupLabel');
    });

    it('input list attribute matches the datalist id', () => {
        const row = makeComboInput('Group', '', 'path', [], 'my-datalist');
        const input = row.querySelector<HTMLInputElement>('input')!;
        expect(input.getAttribute('list')).toBe('my-datalist');
        expect(row.querySelector('datalist')?.id).toBe('my-datalist');
    });

    it('renders an option element for each provided option', () => {
        const row = makeComboInput('Group', '', 'path', ['Alpha', 'Beta', 'Gamma'], 'list-3');
        const opts = row.querySelectorAll('datalist option');
        expect(opts.length).toBe(3);
        expect(opts[0].getAttribute('value')).toBe('Alpha');
        expect(opts[2].getAttribute('value')).toBe('Gamma');
    });

    it('renders with an empty options list', () => {
        const row = makeComboInput('Group', '', 'path', [], 'list-4');
        expect(row.querySelectorAll('datalist option').length).toBe(0);
    });

    it('is picked up by collectFormData as a text value', () => {
        const container = document.createElement('div') as HTMLDivElement;
        const row = makeComboInput(
            'Group',
            'Antipsychotics',
            'optgroupLabel',
            ['Antipsychotics'],
            'list-5',
        );
        container.append(row);
        container.querySelector<HTMLInputElement>('input')!.value = 'New Category';
        const result = collectFormData(container, {}) as Record<string, unknown>;
        expect(result.optgroupLabel).toBe('New Category');
    });
});

describe('makeListEditor', () => {
    it('renders a label', () => {
        const row = makeListEditor('My List', [], 'list.path');
        const label = row.querySelector('label')!;
        expect(label.textContent).toBe('My List');
    });

    it('renders existing items as textareas', () => {
        const row = makeListEditor('Items', ['Alpha', 'Beta'], 'items.path');
        const textareas = row.querySelectorAll<HTMLTextAreaElement>('.list-item textarea');
        expect(textareas.length).toBe(2);
        expect(textareas[0].value).toBe('Alpha');
        expect(textareas[1].value).toBe('Beta');
    });

    it('adds a new blank textarea when "+ Add" is clicked', () => {
        const row = makeListEditor('Items', ['Existing'], 'items.path');
        const addBtn = row.querySelector<HTMLButtonElement>('.add-item-btn')!;
        addBtn.click();
        const textareas = row.querySelectorAll<HTMLTextAreaElement>('.list-item textarea');
        expect(textareas.length).toBe(2);
        expect(textareas[1].value).toBe('');
    });

    it('removes an item when its remove button is clicked', () => {
        const row = makeListEditor('Items', ['A', 'B'], 'items.path');
        const removeButtons = row.querySelectorAll<HTMLButtonElement>('.remove-btn');
        expect(removeButtons.length).toBe(2);
        removeButtons[0].click();
        const remaining = row.querySelectorAll<HTMLTextAreaElement>('.list-item textarea');
        expect(remaining.length).toBe(1);
        expect(remaining[0].value).toBe('B');
    });
});

describe('collectFormData', () => {
    it('writes a new value to a nested path that does not exist yet in the base data', () => {
        const formEditor = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'new value';
        input.dataset.path = 'brand.new.key';
        formEditor.appendChild(input);

        const base: Record<string, unknown> = {};
        const result = collectFormData(formEditor, base) as { brand: { new: { key: string } } };
        expect(result.brand.new.key).toBe('new value');
    });
});
