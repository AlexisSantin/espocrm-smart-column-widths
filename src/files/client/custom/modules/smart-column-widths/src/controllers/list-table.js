import {
    calculateTableSizing,
    constrainWidth,
    fitColumnWidths,
    findHeaderAtResizeBoundary,
    measureContentWidth,
} from 'smart-column-widths:utils/field-sizing';
import {reorderNamedCells} from
    'smart-column-widths:utils/dom-order';

export default class ListTableController {

    /**
     * @param {import('./list-column-manager').default} manager
     */
    constructor(manager) {
        this.manager = manager;
        this.table = null;
        this.listElement = null;
        this.colMap = new Map();
        this.staticWidth = 0;
        this.activeInteraction = null;

        this.onPointerDownBind = this.onPointerDown.bind(this);
        this.onDoubleClickBind = this.onDoubleClick.bind(this);
        this.onTablePointerMoveBind = this.onTablePointerMove.bind(this);
        this.onTablePointerLeaveBind = this.clearResizeHover.bind(this);
        this.onPointerMoveBind = this.onPointerMove.bind(this);
        this.onPointerUpBind = this.onPointerUp.bind(this);
        this.onPointerCancelBind = this.onPointerCancel.bind(this);
        this.onWindowResizeBind = this.layoutTable.bind(this);
    }

    attach() {
        const table = this.manager.view.element
            .querySelector('.list > table');

        if (!table) {
            this.detachTable();

            return;
        }

        if (this.table !== table) {
            this.detachTable();
            this.table = table;
            this.listElement = table.closest('.list');
            table.addEventListener('pointerdown', this.onPointerDownBind);
            table.addEventListener('dblclick', this.onDoubleClickBind);
            table.addEventListener(
                'pointermove',
                this.onTablePointerMoveBind
            );
            table.addEventListener(
                'pointerleave',
                this.onTablePointerLeaveBind
            );
            window.addEventListener('resize', this.onWindowResizeBind);
        }

        this.listElement?.classList.add('scw-list');
        table.classList.add('column-resizable', 'scw-managed-table');
        this.prepareHeaders();
        this.applyColumnOrder();
        this.captureInitialWidths();
        this.buildColumnModel();
        this.layoutTable();
    }

    applyColumnOrder() {
        if (!this.table) {
            return;
        }

        const headerRow = this.table.querySelector(
            ':scope > thead > tr'
        );

        if (headerRow) {
            this.reorderRowCells(
                headerRow,
                ':scope > th.field-header-cell[data-name]'
            );
        }

        this.table.querySelectorAll(':scope > tbody > tr.list-row')
            .forEach(row => {
                this.reorderRowCells(
                    row,
                    ':scope > td.cell[data-name]'
                );
            });
    }

    reorderRowCells(row, selector) {
        const order = this.manager.getState()?.order || [];

        reorderNamedCells(row, selector, order);
    }

    prepareHeaders() {
        this.getFieldHeaders().forEach(header => {
            let resizer = header.querySelector(':scope > .column-resizer');

            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'column-resizer';
                header.append(resizer);
            }

            resizer.classList.add('column-resizer-right', 'scw-resizer');
            resizer.title = this.manager.view.translate(
                'Resize Column',
                'labels',
                'SmartColumnWidths'
            );

            if (!header.querySelector(':scope > .scw-drag-handle')) {
                const handle = document.createElement('button');

                handle.type = 'button';
                handle.className = 'scw-drag-handle';
                handle.tabIndex = -1;
                handle.title = this.manager.view.translate(
                    'Move Column',
                    'labels',
                    'SmartColumnWidths'
                );
                handle.setAttribute('aria-label', handle.title);
                handle.innerHTML =
                    '<span class="fas fa-grip-vertical fa-sm"></span>';
                header.prepend(handle);
            }
        });
    }

    captureInitialWidths() {
        let map = {};

        this.getFieldHeaders().forEach(header => {
            map[header.dataset.name] = header.getBoundingClientRect().width;
        });

        if (this.manager.shouldFitInitialWidths()) {
            map = fitColumnWidths(
                map,
                this.getAvailableFieldWidth(),
                this.manager.getMinimumWidth()
            );
            this.manager.captureWidths(map, 1);

            return;
        }

        this.manager.captureWidths(map);
    }

    getAvailableFieldWidth() {
        const headerRow = this.table?.querySelector(
            ':scope > thead > tr'
        );

        if (!headerRow || !this.listElement) {
            return 0;
        }

        const staticWidth = [...headerRow.children]
            .filter(header =>
                !header.classList.contains('scw-filler-cell') &&
                (
                    !header.classList.contains('field-header-cell') ||
                    header.classList.contains('action-cell')
                )
            )
            .reduce(
                (width, header) =>
                    width + header.getBoundingClientRect().width,
                0
            );

        return Math.max(
            0,
            this.listElement.clientWidth - staticWidth - 2
        );
    }

    buildColumnModel() {
        this.table.querySelector(':scope > colgroup.scw-colgroup')?.remove();

        const headerRow = this.table.querySelector(':scope > thead > tr');

        if (!headerRow) {
            return;
        }

        this.ensureFillerCells(headerRow);

        const colgroup = document.createElement('colgroup');

        colgroup.className = 'scw-colgroup';
        this.colMap.clear();
        this.staticWidth = 0;

        [...headerRow.children].forEach(header => {
            const col = document.createElement('col');
            const name = header.dataset.name;

            if (name && header.classList.contains('field-header-cell')) {
                col.dataset.name = name;
                this.colMap.set(name, col);
            } else if (header.classList.contains('scw-filler-cell')) {
                col.className = 'scw-filler-col';
            } else {
                const width = Math.ceil(
                    header.getBoundingClientRect().width
                );

                col.style.width = `${width}px`;
                this.staticWidth += width;
            }

            colgroup.append(col);
        });

        this.table.prepend(colgroup);
    }

    ensureFillerCells(headerRow) {
        this.placeFillerCell(
            headerRow,
            'th',
            ':scope > th.action-cell'
        );

        this.table.querySelectorAll(':scope > tbody > tr.list-row')
            .forEach(row => {
                this.placeFillerCell(
                    row,
                    'td',
                    ':scope > td[data-name="buttons"]'
                );
            });
    }

    placeFillerCell(row, tagName, boundarySelector) {
        const fillers = [
            ...row.querySelectorAll(':scope > .scw-filler-cell'),
        ];
        const filler = fillers.shift() ||
            document.createElement(tagName);
        const boundary = row.querySelector(boundarySelector);

        fillers.forEach(element => element.remove());
        filler.className = 'scw-filler-cell';
        filler.setAttribute('aria-hidden', 'true');

        boundary ?
            row.insertBefore(filler, boundary) :
            row.append(filler);
    }

    layoutTable() {
        if (!this.table?.isConnected || !this.listElement) {
            return;
        }

        const state = this.manager.getState();

        if (!state) {
            return;
        }

        let fieldWidth = 0;

        this.colMap.forEach((col, name) => {
            const storedWidth = state.widths[name];
            const width = Number.isFinite(storedWidth) ?
                Math.max(1, storedWidth) :
                this.manager.getMinimumWidth();

            col.style.width = `${width}px`;
            fieldWidth += width;
        });

        const available = this.listElement.clientWidth;
        const fixedWidth = this.staticWidth + fieldWidth;
        const sizing = calculateTableSizing(available, fixedWidth);
        const filler = this.table.querySelector(
            ':scope > colgroup > col.scw-filler-col'
        );

        if (filler) {
            filler.style.width = `${sizing.fillerWidth}px`;
        }

        this.table.style.width = `${sizing.tableWidth}px`;
        this.table.style.minWidth = '';
        this.table.style.tableLayout = 'fixed';
    }

    onPointerDown(event) {
        const resizer = event.target.closest('.scw-resizer');
        const dragHandle = event.target.closest('.scw-drag-handle');
        const header = resizer?.closest('th[data-name]') ||
            this.getResizeHeaderAtPointer(event);

        if (header) {
            this.startResize(event, header);

            return;
        }

        if (dragHandle) {
            this.startReorder(event, dragHandle);
        }
    }

    startResize(event, header) {
        if (!event.isPrimary || event.button !== 0) {
            return;
        }

        const name = header?.dataset.name;

        if (!name) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const width = this.manager.getState().widths[name] ||
            header.getBoundingClientRect().width;

        this.activeInteraction = {
            type: 'resize',
            name,
            startX: event.clientX,
            startWidth: width,
            width,
            minimum: this.manager.getMinimumWidth(),
        };

        header.classList.add('being-resized');
        document.body.classList.add('scw-is-resizing');
        this.createGuide(event.clientX, 'resize');
        this.bindWindowPointerEvents();
    }

    startReorder(event, handle) {
        if (!event.isPrimary || event.button !== 0) {
            return;
        }

        const header = handle.closest('th[data-name]');
        const name = header?.dataset.name;

        if (!name) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.activeInteraction = {
            type: 'reorder',
            name,
            startX: event.clientX,
            active: false,
            beforeName: null,
        };
        this.bindWindowPointerEvents();
    }

    bindWindowPointerEvents() {
        window.addEventListener('pointermove', this.onPointerMoveBind);
        window.addEventListener('pointerup', this.onPointerUpBind);
        window.addEventListener('pointercancel', this.onPointerCancelBind);
    }

    onPointerMove(event) {
        if (!this.activeInteraction) {
            return;
        }

        if (this.activeInteraction.type === 'resize') {
            const direction =
                document.documentElement.dir === 'rtl' ? -1 : 1;
            const delta =
                (event.clientX - this.activeInteraction.startX) * direction;
            const width = constrainWidth(
                this.activeInteraction.startWidth + delta,
                this.activeInteraction.minimum
            );

            this.activeInteraction.width = width;
            this.manager.getState().widths[
                this.activeInteraction.name
            ] = width;
            this.updateGuide(event.clientX);
            this.layoutTable();

            return;
        }

        if (
            !this.activeInteraction.active &&
            Math.abs(event.clientX - this.activeInteraction.startX) < 5
        ) {
            return;
        }

        this.activeInteraction.active = true;
        document.body.classList.add('scw-is-reordering');

        const headers = this.getFieldHeaders()
            .filter(header =>
                header.dataset.name !== this.activeInteraction.name
            );
        const target = headers.find(header => {
            const rect = header.getBoundingClientRect();

            return event.clientX < rect.left + rect.width / 2;
        });

        this.activeInteraction.beforeName = target?.dataset.name || null;
        this.createGuide(
            target ?
                target.getBoundingClientRect().left :
                this.getLastFieldBoundary(),
            'reorder'
        );
    }

    async onPointerUp() {
        const interaction = this.activeInteraction;

        if (!interaction) {
            return;
        }

        this.cleanupInteraction();

        if (interaction.type === 'resize') {
            this.manager.setWidth(interaction.name, interaction.width);

            return;
        }

        if (interaction.active) {
            await this.manager.moveColumn(
                interaction.name,
                interaction.beforeName
            );
        }
    }

    onPointerCancel() {
        const interaction = this.activeInteraction;

        if (interaction?.type === 'resize') {
            this.manager.getState().widths[interaction.name] =
                interaction.startWidth;
            this.layoutTable();
        }

        this.cleanupInteraction();
    }

    onDoubleClick(event) {
        const resizer = event.target.closest('.scw-resizer');
        const header = resizer?.closest('th[data-name]') ||
            this.getResizeHeaderAtPointer(event);

        if (!header) {
            return;
        }

        const name = header?.dataset.name;

        if (!name) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const escaped = window.CSS?.escape ?
            window.CSS.escape(name) :
            name.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        const cells = [
            ...this.table.querySelectorAll(
                `:scope > tbody > tr.list-row > td.cell[data-name="${escaped}"]`
            ),
        ];
        const width = measureContentWidth(
            cells,
            this.manager.getMinimumWidth()
        );

        this.manager.getState().widths[name] = width;
        this.manager.setWidth(name, width);
        this.layoutTable();
    }

    onTablePointerMove(event) {
        if (this.activeInteraction) {
            return;
        }

        const header = this.getResizeHeaderAtPointer(event);

        this.table?.classList.toggle('scw-resize-hot', Boolean(header));
        this.table?.querySelector('th.scw-resize-hot')
            ?.classList.remove('scw-resize-hot');
        header?.classList.add('scw-resize-hot');
    }

    getResizeHeaderAtPointer(event) {
        if (!event.target.closest('thead')) {
            return null;
        }

        return findHeaderAtResizeBoundary(
            this.getFieldHeaders(),
            event.clientX,
            document.documentElement.dir === 'rtl'
        );
    }

    clearResizeHover() {
        this.table?.classList.remove('scw-resize-hot');
        this.table?.querySelector('th.scw-resize-hot')
            ?.classList.remove('scw-resize-hot');
    }

    createGuide(x, type) {
        let guide = document.querySelector('.scw-column-guide');

        if (!guide) {
            guide = document.createElement('div');
            guide.className = 'scw-column-guide';
            document.body.append(guide);
        }

        guide.dataset.type = type;
        guide.style.left = `${Math.round(x)}px`;

        if (this.table) {
            const rect = this.table.getBoundingClientRect();

            guide.style.top = `${Math.round(rect.top)}px`;
            guide.style.height = `${Math.round(rect.height)}px`;
        }
    }

    updateGuide(x) {
        const guide = document.querySelector('.scw-column-guide');

        if (guide) {
            guide.style.left = `${Math.round(x)}px`;
        }
    }

    getLastFieldBoundary() {
        const headers = this.getFieldHeaders();
        const last = headers[headers.length - 1];

        return last ? last.getBoundingClientRect().right : 0;
    }

    getFieldHeaders() {
        if (!this.table) {
            return [];
        }

        return [...this.table.querySelectorAll(
            ':scope > thead > tr > th.field-header-cell[data-name]'
        )].filter(header => !header.classList.contains('action-cell'));
    }

    cleanupInteraction() {
        window.removeEventListener('pointermove', this.onPointerMoveBind);
        window.removeEventListener('pointerup', this.onPointerUpBind);
        window.removeEventListener('pointercancel', this.onPointerCancelBind);
        document.body.classList.remove(
            'scw-is-resizing',
            'scw-is-reordering'
        );
        this.table?.querySelector('th.being-resized')
            ?.classList.remove('being-resized');
        this.clearResizeHover();
        document.querySelector('.scw-column-guide')?.remove();
        this.activeInteraction = null;
    }

    detachTable() {
        this.cleanupInteraction();

        if (this.table) {
            this.table.removeEventListener(
                'pointerdown',
                this.onPointerDownBind
            );
            this.table.removeEventListener(
                'dblclick',
                this.onDoubleClickBind
            );
            this.table.removeEventListener(
                'pointermove',
                this.onTablePointerMoveBind
            );
            this.table.removeEventListener(
                'pointerleave',
                this.onTablePointerLeaveBind
            );
        }

        window.removeEventListener('resize', this.onWindowResizeBind);
        this.listElement?.classList.remove('scw-list');
        this.table?.querySelectorAll('.scw-filler-cell')
            .forEach(element => element.remove());
        this.table = null;
        this.listElement = null;
        this.colMap.clear();
    }

    dispose() {
        this.detachTable();
        document.querySelector('.scw-column-guide')?.remove();
    }
}
