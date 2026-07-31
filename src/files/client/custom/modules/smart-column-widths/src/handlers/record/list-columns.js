import ListColumnManager from
    'smart-column-widths:controllers/list-column-manager';

export default class ListColumnsSetupHandler {

    constructor(view) {
        this.view = view;
    }

    process() {
        const existingManager = this.view._smartColumnWidthsManager;

        if (
            !this.view.entityType ||
            !this.view.header ||
            existingManager && !existingManager.removed
        ) {
            return;
        }

        try {
            const manager = new ListColumnManager(this.view);

            this.view._smartColumnWidthsManager = manager;
            manager.setup();
        } catch (error) {
            console.error(
                'Smart Column Widths setup failed.',
                error
            );
        }
    }
}
