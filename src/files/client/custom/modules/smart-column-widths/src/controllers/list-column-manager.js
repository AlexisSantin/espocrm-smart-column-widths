import ColumnStore from 'smart-column-widths:utils/column-store';
import {applyOrderToLayout} from
    'smart-column-widths:utils/column-state';
import {getFieldMinimumWidth} from 'smart-column-widths:utils/field-sizing';
import ListTableController from
    'smart-column-widths:controllers/list-table';

export default class ListColumnManager {

    /**
     * @param {import('views/record/list-base').default} view
     */
    constructor(view) {
        this.view = view;
        this.entityType = view.entityType || view.scope;
        this.layoutName = view.layoutName || view.type || 'list';
        this.store = new ColumnStore(
            view.getStorage(),
            this.entityType,
            this.layoutName,
            view.getUser().id
        );
        this.administratorLayout = null;
        this.state = null;
        this.tableController = new ListTableController(this);
        this.removed = false;
        this.settingsElement = null;
        this.settingsMenuOpen = false;

        this.onSettingsClickBind = this.onSettingsClick.bind(this);
        this.onDocumentClickBind = this.onDocumentClick.bind(this);
    }

    setup() {
        this.view.on('after:render', () => {
            window.requestAnimationFrame(() => {
                if (this.removed) {
                    return;
                }

                try {
                    this.afterRender();
                } catch (error) {
                    console.error(
                        'Smart Column Widths rendering failed.',
                        error
                    );
                }
            });
        });
        document.addEventListener('click', this.onDocumentClickBind);
        this.view.once('remove', () => this.dispose());
    }

    afterRender() {
        if (this.removed || !this.view.element) {
            return;
        }

        if (!this.state) {
            this.initializeState();
        }

        if (!this.state) {
            return;
        }

        this.tableController.attach();
        this.bindPersistentSettingsMenu();
    }

    bindPersistentSettingsMenu() {
        const element = this.view.element.querySelector(
            '.settings-container'
        );

        if (this.settingsElement !== element) {
            this.settingsElement?.removeEventListener(
                'click',
                this.onSettingsClickBind
            );
            this.settingsElement = element;
            this.settingsElement?.addEventListener(
                'click',
                this.onSettingsClickBind
            );
        }

        this.hideNativeResizeSetting();
        this.ensureResetAction();

        if (!this.settingsMenuOpen || !this.settingsElement) {
            return;
        }

        const group = this.settingsElement.querySelector('.btn-group');

        group?.classList.add('open');
        group?.querySelector('.dropdown-toggle')
            ?.setAttribute('aria-expanded', 'true');
    }

    hideNativeResizeSetting() {
        const action = this.settingsElement?.querySelector(
            '[data-action="toggleColumnResize"]'
        );
        const item = action?.closest('li');

        if (!item) {
            return;
        }

        item.classList.add('hidden');

        if (item.previousElementSibling?.classList.contains('divider')) {
            item.previousElementSibling.classList.add('hidden');
        }
    }

    ensureResetAction() {
        const menu = this.settingsElement?.querySelector('.dropdown-menu');

        if (!menu || menu.querySelector('[data-action="scwResetColumns"]')) {
            return;
        }

        const divider = document.createElement('li');
        const item = document.createElement('li');
        const action = document.createElement('a');
        const label = this.view.translate(
            'Reset Order and Widths',
            'labels',
            'SmartColumnWidths'
        );

        divider.className = 'divider scw-reset-columns-divider';
        item.className = 'scw-reset-columns-item';
        action.role = 'button';
        action.tabIndex = 0;
        action.dataset.action = 'scwResetColumns';
        action.title = label;
        action.innerHTML = [
            '<span class="item-icon fas fa-undo"></span>',
            `<span class="item-text">${this.escapeHtml(label)}</span>`,
        ].join(' ');

        item.append(action);
        menu.append(divider, item);
    }

    escapeHtml(value) {
        const element = document.createElement('span');

        element.textContent = value;

        return element.innerHTML;
    }

    onSettingsClick(event) {
        this.ensureResetAction();

        const resetAction = event.target.closest(
            '[data-action="scwResetColumns"]'
        );

        if (resetAction) {
            event.preventDefault();
            event.stopPropagation();
            this.closeSettingsMenu();
            void this.resetColumns();

            return;
        }

        if (!event.target.closest('.dropdown-menu')) {
            return;
        }

        this.settingsMenuOpen = true;

        // The native EspoCRM action has already been handled on this same
        // container. Prevent only Bootstrap's document-level auto-close.
        event.stopPropagation();
    }

    onDocumentClick(event) {
        if (
            this.settingsElement &&
            this.settingsElement.contains(event.target)
        ) {
            return;
        }

        this.settingsMenuOpen = false;
    }

    closeSettingsMenu() {
        this.settingsMenuOpen = false;

        const group = this.settingsElement?.querySelector('.btn-group');

        group?.classList.remove('open');
        group?.querySelector('.dropdown-toggle')
            ?.setAttribute('aria-expanded', 'false');
    }

    initializeState() {
        if (!Array.isArray(this.view.listLayout)) {
            return;
        }

        this.administratorLayout = this.view.listLayout
            .map(item => ({...item}));
        this.state = this.store.load(this.administratorLayout);
    }

    getState() {
        if (!this.state && this.administratorLayout) {
            this.state = this.store.load(this.administratorLayout);
        }

        return this.state;
    }

    getMinimumWidth() {
        return getFieldMinimumWidth();
    }

    captureWidths(widthMap, minimum = this.getMinimumWidth()) {
        if (!this.state) {
            return;
        }

        let changed = false;

        Object.entries(widthMap).forEach(([name, width]) => {
            if (name in this.state.widths || !Number.isFinite(width)) {
                return;
            }

            this.state.widths[name] = Math.max(
                minimum,
                Math.round(width)
            );
            changed = true;
        });

        if (changed) {
            this.store.save();
        }
    }

    shouldFitInitialWidths() {
        return Boolean(this.state) &&
            Object.keys(this.state.widths).length === 0;
    }

    setWidth(name, width) {
        if (!this.state) {
            return;
        }

        this.state.widths[name] = Math.max(
            this.getMinimumWidth(),
            Math.round(width)
        );
        this.store.save();
    }

    async moveColumn(name, beforeName = null) {
        if (!this.state || name === beforeName) {
            return;
        }

        const order = this.state.order.filter(item => item !== name);
        const index = beforeName ? order.indexOf(beforeName) : -1;

        index === -1 ?
            order.push(name) :
            order.splice(index, 0, name);

        this.state.order = order;
        this.store.save();
        await this.refresh();
    }

    async refresh() {
        if (!this.state || !this.administratorLayout) {
            return;
        }

        this.view.listLayout = applyOrderToLayout(
            this.administratorLayout,
            this.state.order
        );
        this.view._internalLayout = null;

        const selectAttributes = await this.view.getSelectAttributeList();

        if (selectAttributes) {
            this.view.collection.data.select = selectAttributes.join(',');
        }

        await this.view.collection.fetch();
    }

    async resetColumns() {
        if (!this.administratorLayout) {
            return;
        }

        this.store.clear();
        this.state = this.store.load(this.administratorLayout);

        try {
            await this.refresh();
        } catch (error) {
            console.error(
                'Smart Column Widths reset failed.',
                error
            );
        }
    }

    dispose() {
        this.removed = true;
        document.removeEventListener('click', this.onDocumentClickBind);
        this.settingsElement?.removeEventListener(
            'click',
            this.onSettingsClickBind
        );
        this.settingsElement = null;
        this.tableController.dispose();
    }
}
