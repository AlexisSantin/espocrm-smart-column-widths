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
        ':scope > .scw-filler-cell, ' +
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
