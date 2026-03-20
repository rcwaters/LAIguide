import { createEl, makeSection, makeTextInput, makeListEditor } from './helpers';
import { enableDrag, refreshDragHandles } from './dragDrop';

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function reindexDefinitionPaths(listContainer: HTMLElement, groupKey: string): void {
    const re = new RegExp(`${escapeRegex(groupKey)}\\.definitions\\.\\d+`, 'g');
    listContainer.querySelectorAll<HTMLElement>('.definition-block').forEach((defBlock, idx) => {
        defBlock.querySelectorAll<HTMLElement>('[data-path]').forEach((node) => {
            node.dataset.path = node.dataset.path!.replace(re, `${groupKey}.definitions.${idx}`);
        });
        const labelInput = defBlock.querySelector<HTMLInputElement>('[data-path$=".label"]');
        const labelSpan = defBlock.querySelector<HTMLElement>('.tier-label-text');
        if (labelSpan) {
            labelSpan.textContent = labelInput?.value?.trim() || `Definition ${idx + 1}`;
        }
    });
}

function renderDefinitionBlock(
    def: Record<string, unknown>,
    groupKey: string,
    idx: number,
): HTMLDivElement {
    const block = createEl('div', { class: 'tier-block definition-block', draggable: 'true' });
    const handle = createEl('span', {
        class: 'drag-handle',
        title: 'Drag to reorder',
        textContent: '⠿',
    });
    const labelSpan = createEl('span', {
        class: 'tier-label-text',
        textContent: (def.label as string) || `Definition ${idx + 1}`,
    });
    const header = createEl('div', { class: 'tier-header' }, [
        handle,
        createEl('span', { class: 'chevron', textContent: '▼' }),
        labelSpan,
    ]);
    header.addEventListener('click', () => block.classList.toggle('collapsed'));

    const body = createEl('div', { class: 'tier-body' });

    const labelRow = makeTextInput(
        'Label',
        (def.label as string) ?? '',
        `${groupKey}.definitions.${idx}.label`,
    );
    const labelInput = labelRow.querySelector<HTMLInputElement>('input')!;
    labelInput.addEventListener('input', () => {
        labelSpan.textContent = labelInput.value.trim() || `Definition ${idx + 1}`;
    });
    body.append(labelRow);

    body.append(
        makeListEditor(
            'All Criteria',
            (def.allCriteria as string[]) ?? [],
            `${groupKey}.definitions.${idx}.allCriteria`,
        ),
    );
    body.append(
        makeTextInput(
            'Description',
            (def.description as string) ?? '',
            `${groupKey}.definitions.${idx}.description`,
        ),
    );

    const removeBtn = createEl('button', {
        class: 'remove-scenario-btn',
        type: 'button',
        textContent: '✕ Remove',
    });
    removeBtn.addEventListener('click', () => {
        block.dispatchEvent(
            new CustomEvent('removedefinition', {
                bubbles: true,
                detail: { groupKey, defIdx: idx },
            }),
        );
    });
    body.append(removeBtn);

    block.append(header, body);
    return block;
}

export function renderDefinitionsForm(
    container: HTMLDivElement,
    data: Record<string, unknown>,
): void {
    container.innerHTML = '';

    for (const [groupKey, groupValue] of Object.entries(data)) {
        if (
            !groupValue ||
            typeof groupValue !== 'object' ||
            !(groupValue as Record<string, unknown>).groupTitle
        ) {
            continue;
        }
        const group = groupValue as Record<string, unknown>;
        const { section, body } = makeSection(group.groupTitle as string);

        body.append(
            makeTextInput('Group Title', group.groupTitle as string, `${groupKey}.groupTitle`),
        );

        const defsContainer = createEl('div', { class: 'definitions-list' });
        const definitions = (group.definitions as Record<string, unknown>[]) ?? [];
        for (let i = 0; i < definitions.length; i++) {
            defsContainer.append(renderDefinitionBlock(definitions[i], groupKey, i));
        }

        enableDrag(defsContainer, '.definition-block', () =>
            reindexDefinitionPaths(defsContainer, groupKey),
        );
        refreshDragHandles(defsContainer, '.definition-block');

        const addBtn = createEl('button', {
            class: 'add-scenario-btn',
            type: 'button',
            textContent: '+ Add Definition',
        });
        addBtn.addEventListener('click', () => {
            defsContainer.dispatchEvent(
                new CustomEvent('adddefinition', { bubbles: true, detail: { groupKey } }),
            );
        });

        body.append(defsContainer, addBtn);
        container.append(section);
    }
}
