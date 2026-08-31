import {
    columnStateVersion,
    reconcileState,
} from 'better-columns:utils/column-state';

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
        const raw = this.storage.get('betterColumns', this.key);

        this.state = reconcileState(raw, administratorLayout);

        return this.state;
    }

    save() {
        if (!this.state) {
            return;
        }

        this.state.version = columnStateVersion;
        this.storage.set('betterColumns', this.key, this.state);
    }

    clear() {
        this.storage.clear('betterColumns', this.key);
        this.state = null;
    }
}

