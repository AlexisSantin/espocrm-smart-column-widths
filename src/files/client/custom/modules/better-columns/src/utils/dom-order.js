/**
 * Reorder named cells while preserving technical cells around them.
 *
 * EspoCRM identifies the actions header with `action-cell`, but identifies
 * row action cells with `data-name="buttons"`. Both are treated as the
 * trailing boundary for managed columns.
 *
 * @param {HTMLTableRowElement} row
 * @param {string} selector
 * @param {string[]} order
 */
export function reorderNamedCells(row, selector, order) {
    const cellMap = new Map(
        [...row.querySelectorAll(selector)]
            .map(cell => [cell.dataset.name, cell])
    );
    const boundary = row.querySelector(
        ':scope > .better-columns-filler-cell, ' +
        ':scope > .action-cell, ' +
        ':scope > [data-name="buttons"]'
    );

    order.forEach(name => {
        const cell = cellMap.get(name);

        if (!cell) {
            return;
        }

        boundary ?
            row.insertBefore(cell, boundary) :
            row.append(cell);
    });
}

const interactiveHeaderSelector = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    '[contenteditable="true"]',
    '[data-action]',
    '[role="button"]',
    '.column-resizer',
    '.better-columns-resizer',
].join(', ');

/**
 * Allow reorder gestures only outside native interactive header content.
 *
 * @param {EventTarget|null} target
 * @return {boolean}
 */
export function canStartHeaderReorder(target) {
    if (!(target instanceof Element)) {
        return false;
    }

    return !target.closest(interactiveHeaderSelector);
}
