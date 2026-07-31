import {
    columnStateVersion,
    reconcileState,
} from 'smart-column-widths:utils/column-state';

export default class ColumnStore {

    /**
     * @param {import('storage').default} storage
     * @param {string} entityType
     * @param {string} layoutName
     * @param {string} userId
     */
    constructor(storage, entityType, layoutName, userId) {
        this.storage = storage;
        this.key = `${layoutName}-${entityType}-${userId}`;
        this.state = null;
    }

    /**
     * @param {Array<Record<string, any>>} administratorLayout
     */
    load(administratorLayout) {
        const raw = this.storage.get('smartColumnWidths', this.key);

        this.state = reconcileState(raw, administratorLayout);

        return this.state;
    }

    save() {
        if (!this.state) {
            return;
        }

        this.state.version = columnStateVersion;
        this.storage.set('smartColumnWidths', this.key, this.state);
    }

    clear() {
        this.storage.clear('smartColumnWidths', this.key);
        this.state = null;
    }
}

