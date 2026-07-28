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

    onSettingsClick(event) {
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

    captureWidths(widthMap) {
        if (!this.state) {
            return;
        }

        let changed = false;

        Object.entries(widthMap).forEach(([name, width]) => {
            if (name in this.state.widths || !Number.isFinite(width)) {
                return;
            }

            this.state.widths[name] = Math.max(
                this.getMinimumWidth(),
                Math.round(width)
            );
            changed = true;
        });

        if (changed) {
            this.store.save();
        }
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
