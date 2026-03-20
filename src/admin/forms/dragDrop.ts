/**
 * Shows or hides drag handles based on whether there are enough items to
 * reorder. Call this after items are added or removed from the container.
 */
export function refreshDragHandles(container: HTMLElement, itemSelector: string): void {
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    const canDrag = items.length > 1;
    items.forEach((item) => {
        item.draggable = canDrag;
        const handle = item.querySelector<HTMLElement>('.drag-handle');
        if (handle) handle.style.visibility = canDrag ? '' : 'hidden';
    });
}

/**
 * Enables drag-to-reorder on children matching `itemSelector` inside
 * `container`. Drag only activates from a `.drag-handle` element.
 * A coloured border line shows the exact drop position before releasing.
 */
export function enableDrag(
    container: HTMLElement,
    itemSelector: string,
    onDrop?: () => void,
): void {
    let dragged: HTMLElement | null = null;
    let dropTarget: HTMLElement | null = null;
    let dropBefore = true;
    let dragAllowed = false;

    // e.target in dragstart is the draggable element, not the element the
    // pointer was on. Track mousedown separately to know if the handle was grabbed.
    container.addEventListener('mousedown', (e) => {
        dragAllowed = !!(e.target as HTMLElement).closest('.drag-handle');
    });

    function clearIndicator() {
        dropTarget?.classList.remove('drop-before', 'drop-after');
        dropTarget = null;
    }

    container.addEventListener('dragstart', (e) => {
        if (!dragAllowed) {
            e.preventDefault();
            return;
        }
        if (container.querySelectorAll(itemSelector).length <= 1) {
            e.preventDefault();
            return;
        }
        const item = (e.target as HTMLElement).closest(itemSelector) as HTMLElement | null;
        if (!item || !container.contains(item)) return;
        dragged = item;
        e.dataTransfer!.effectAllowed = 'move';
        requestAnimationFrame(() => item.classList.add('dragging'));
    });

    container.addEventListener('dragend', () => {
        dragged?.classList.remove('dragging');
        clearIndicator();
        dragged = null;
        onDrop?.();
    });

    container.addEventListener('dragover', (e) => {
        if (!dragged) return;
        e.preventDefault();
        const target = (e.target as HTMLElement).closest(itemSelector) as HTMLElement | null;
        if (!target || target === dragged || !container.contains(target)) {
            clearIndicator();
            return;
        }
        const rect = target.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (target !== dropTarget || before !== dropBefore) {
            clearIndicator();
            dropTarget = target;
            dropBefore = before;
            target.classList.add(before ? 'drop-before' : 'drop-after');
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragged || !dropTarget) return;
        container.insertBefore(dragged, dropBefore ? dropTarget : dropTarget.nextSibling);
        clearIndicator();
    });
}
