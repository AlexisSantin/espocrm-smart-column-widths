import SettingsEditRecordView from 'views/settings/record/edit';

export default class SmartColumnWidthsSettingsView
    extends SettingsEditRecordView {

    layoutName = 'smartColumnWidths'

    dynamicLogicDefs = {
        fields: {
            smartColumnWidthsAllEntities: {
                visible: {
                    conditionGroup: [
                        {
                            attribute: 'smartColumnWidthsEnabled',
                            type: 'isTrue',
                        },
                    ],
                },
            },
            smartColumnWidthsEntityList: {
                visible: {
                    conditionGroup: [
                        {
                            attribute: 'smartColumnWidthsEnabled',
                            type: 'isTrue',
                        },
                        {
                            attribute: 'smartColumnWidthsAllEntities',
                            type: 'isFalse',
                        },
                    ],
                },
            },
        },
    }

    setup() {
        if (this.model.get('smartColumnWidthsEnabled') == null) {
            this.model.set('smartColumnWidthsEnabled', true);
        }

        if (this.model.get('smartColumnWidthsAllEntities') == null) {
            this.model.set('smartColumnWidthsAllEntities', true);
        }

        if (this.model.get('smartColumnWidthsEntityList') == null) {
            this.model.set('smartColumnWidthsEntityList', []);
        }

        super.setup();
    }
}
