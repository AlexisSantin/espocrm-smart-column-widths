import ListColumnManager from
    'better-columns:controllers/list-column-manager';

export default class ListColumnsSetupHandler {

    constructor(view) {
        this.view = view;
    }

    process() {
        const existingManager = this.view._betterColumnsManager;

        if (
            !this.view.entityType ||
            !this.view.header ||
            existingManager && !existingManager.removed
        ) {
            return;
        }

        try {
            const manager = new ListColumnManager(this.view);

            this.view._betterColumnsManager = manager;
            manager.setup();
        } catch (error) {
            console.error(
                'Better Columns setup failed.',
                error
            );
        }
    }
}
