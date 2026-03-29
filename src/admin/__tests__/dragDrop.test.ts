// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enableDrag, refreshDragHandles } from '../forms/dragDrop';

// jsdom does not implement DragEvent or DataTransfer; provide minimal polyfills.
class FakeDataTransfer {
    effectAllowed = 'none';
    dropEffect = 'none';
}

if (typeof DragEvent === 'undefined') {
    (globalThis as Record<string, unknown>).DragEvent = class DragEvent extends MouseEvent {
        dataTransfer: FakeDataTransfer;
        constructor(type: string, init: DragEventInit = {}) {
            super(type, init);
            // Always provide a dataTransfer so the source code's e.dataTransfer! doesn't throw.
            this.dataTransfer =
                (init.dataTransfer as unknown as FakeDataTransfer) ?? new FakeDataTransfer();
        }
    };
}

let container: HTMLDivElement;

function makeItem(): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'draggable-item';
    item.draggable = true;
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    item.appendChild(handle);
    return item;
}

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
});

describe('refreshDragHandles', () => {
    it('hides drag handles when only 1 item', () => {
        const item = makeItem();
        container.appendChild(item);
        refreshDragHandles(container, '.draggable-item');
        const handle = item.querySelector<HTMLElement>('.drag-handle')!;
        expect(handle.style.visibility).toBe('hidden');
    });

    it('shows drag handles when 2+ items', () => {
        container.appendChild(makeItem());
        container.appendChild(makeItem());
        refreshDragHandles(container, '.draggable-item');
        container.querySelectorAll<HTMLElement>('.drag-handle').forEach((handle) => {
            expect(handle.style.visibility).toBe('');
        });
    });

    it('sets draggable=false when only 1 item', () => {
        const item = makeItem();
        container.appendChild(item);
        refreshDragHandles(container, '.draggable-item');
        expect(item.draggable).toBe(false);
    });

    it('sets draggable=true when 2+ items', () => {
        const a = makeItem();
        const b = makeItem();
        container.appendChild(a);
        container.appendChild(b);
        refreshDragHandles(container, '.draggable-item');
        expect(a.draggable).toBe(true);
        expect(b.draggable).toBe(true);
    });
});

describe('enableDrag', () => {
    function setup(count = 2) {
        for (let i = 0; i < count; i++) container.appendChild(makeItem());
        enableDrag(container, '.draggable-item');
        return Array.from(container.querySelectorAll<HTMLElement>('.draggable-item'));
    }

    function startDrag(_container: HTMLElement, dragged: HTMLElement) {
        const handle = dragged.querySelector<HTMLElement>('.drag-handle')!;
        handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        dragged.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true }));
    }

    it('cancels dragstart when drag does not originate from a .drag-handle', () => {
        const [item] = setup();
        // mousedown on the item itself (not the handle) — dragAllowed stays false
        item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        const evt = new DragEvent('dragstart', { bubbles: true, cancelable: true });
        let called = false;
        const origPD = evt.preventDefault.bind(evt);
        evt.preventDefault = () => {
            called = true;
            origPD();
        };
        container.dispatchEvent(evt);
        expect(called).toBe(true);
    });

    it('cancels dragstart when there is only 1 matching item', () => {
        const single = document.createElement('div');
        document.body.appendChild(single);
        const item = makeItem();
        single.appendChild(item);
        enableDrag(single, '.draggable-item');

        const handle = item.querySelector('.drag-handle')!;
        handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        const evt = new DragEvent('dragstart', { bubbles: true, cancelable: true });
        let called = false;
        const origPD = evt.preventDefault.bind(evt);
        evt.preventDefault = () => {
            called = true;
            origPD();
        };
        single.dispatchEvent(evt);
        expect(called).toBe(true);
    });

    it('adds drop-before class when pointer is in upper half of target', () => {
        const items = setup(2);
        const [dragged, target] = items;

        startDrag(container, dragged);

        target.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        // clientY 110 < top(100) + height(40)/2 = 120 → upper half → drop-before
        const evt = new DragEvent('dragover', { bubbles: true, cancelable: true, clientY: 110 });
        Object.defineProperty(evt, 'target', { value: target });
        container.dispatchEvent(evt);

        expect(target.classList.contains('drop-before')).toBe(true);
        expect(target.classList.contains('drop-after')).toBe(false);
    });

    it('adds drop-after class when pointer is in lower half of target', () => {
        const items = setup(2);
        const [dragged, target] = items;

        startDrag(container, dragged);

        target.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        // clientY 130 > top(100) + height(40)/2 = 120 → lower half → drop-after
        const evt = new DragEvent('dragover', { bubbles: true, cancelable: true, clientY: 130 });
        Object.defineProperty(evt, 'target', { value: target });
        container.dispatchEvent(evt);

        expect(target.classList.contains('drop-after')).toBe(true);
        expect(target.classList.contains('drop-before')).toBe(false);
    });

    it('inserts dragged element before target on drop when drop-before is set', () => {
        const items = setup(2);
        const [first, second] = items;

        startDrag(container, first);

        second.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        const dragoverEvt = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: 110,
        });
        Object.defineProperty(dragoverEvt, 'target', { value: second });
        container.dispatchEvent(dragoverEvt);

        expect(second.classList.contains('drop-before')).toBe(true);

        const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvt, 'target', { value: second });
        container.dispatchEvent(dropEvt);

        const allItems = Array.from(container.querySelectorAll('.draggable-item'));
        expect(allItems.indexOf(first)).toBeLessThan(allItems.indexOf(second));
    });

    it('inserts dragged element after target on drop when drop-after is set', () => {
        const items = setup(3);
        const [first, second, third] = items;

        startDrag(container, first);

        second.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        // lower half → drop-after
        const dragoverEvt = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: 130,
        });
        Object.defineProperty(dragoverEvt, 'target', { value: second });
        container.dispatchEvent(dragoverEvt);

        expect(second.classList.contains('drop-after')).toBe(true);

        const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvt, 'target', { value: second });
        container.dispatchEvent(dropEvt);

        const allItems = Array.from(container.querySelectorAll('.draggable-item'));
        // first was moved after second
        expect(allItems.indexOf(first)).toBeGreaterThan(allItems.indexOf(second));
        // third was originally last and stays after first
        expect(allItems.indexOf(first)).toBeLessThan(allItems.indexOf(third));
    });

    it('removes .dragging class and clears the drop indicator on dragend', () => {
        const items = setup(2);
        const [dragged, target] = items;

        startDrag(container, dragged);

        target.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        const dragoverEvt = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: 110,
        });
        Object.defineProperty(dragoverEvt, 'target', { value: target });
        container.dispatchEvent(dragoverEvt);

        // rAF doesn't fire in tests; manually add the class
        dragged.classList.add('dragging');

        container.dispatchEvent(new DragEvent('dragend', { bubbles: true }));

        expect(dragged.classList.contains('dragging')).toBe(false);
        expect(target.classList.contains('drop-before')).toBe(false);
        expect(target.classList.contains('drop-after')).toBe(false);
    });

    it('calls the onDrop callback on dragend', () => {
        const onDrop = vi.fn();
        for (let i = 0; i < 2; i++) container.appendChild(makeItem());
        enableDrag(container, '.draggable-item', onDrop);
        const [dragged] = Array.from(container.querySelectorAll<HTMLElement>('.draggable-item'));

        const handle = dragged.querySelector<HTMLElement>('.drag-handle')!;
        handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        dragged.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true }));
        container.dispatchEvent(new DragEvent('dragend', { bubbles: true }));

        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it('does not call onDrop when no callback is provided', () => {
        // Verifies the optional chaining (onDrop?.()) does not throw when absent
        const items = setup(2);
        const [dragged] = items;
        startDrag(container, dragged);
        expect(() =>
            container.dispatchEvent(new DragEvent('dragend', { bubbles: true })),
        ).not.toThrow();
    });

    it('clears drop indicator when dragover target is the dragged element itself', () => {
        const items = setup(2);
        const [dragged, other] = items;

        startDrag(container, dragged);

        // First, set a drop indicator on the other item
        other.getBoundingClientRect = () =>
            ({
                top: 100,
                height: 40,
                left: 0,
                right: 100,
                bottom: 140,
                width: 100,
                x: 0,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;

        const overOther = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: 110,
        });
        Object.defineProperty(overOther, 'target', { value: other });
        container.dispatchEvent(overOther);
        expect(other.classList.contains('drop-before')).toBe(true);

        // Now dragover the dragged element itself — indicator should clear
        const overSelf = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: 110,
        });
        Object.defineProperty(overSelf, 'target', { value: dragged });
        container.dispatchEvent(overSelf);

        expect(other.classList.contains('drop-before')).toBe(false);
        expect(other.classList.contains('drop-after')).toBe(false);
    });
});
