import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const clientMetadataPath = new URL(
    '../files/custom/Espo/Modules/SmartColumnWidths/Resources/metadata/app/client.json',
    import.meta.url
);
const adminPanelMetadataPath = new URL(
    '../files/custom/Espo/Modules/SmartColumnWidths/Resources/metadata/app/adminPanel.json',
    import.meta.url
);
const settingsMetadataPath = new URL(
    '../files/custom/Espo/Modules/SmartColumnWidths/Resources/metadata/entityDefs/Settings.json',
    import.meta.url
);
const settingsLayoutPath = new URL(
    '../files/custom/Espo/Modules/SmartColumnWidths/Resources/layouts/Settings/smartColumnWidths.json',
    import.meta.url
);

test('the bundled frontend initializer is loaded by EspoCRM', async () => {
    const metadata = JSON.parse(
        await readFile(clientMetadataPath, 'utf8')
    );

    assert.deepEqual(metadata.scriptList, [
        '__APPEND__',
        'client/custom/modules/smart-column-widths/lib/init.js',
    ]);
});

test('administration entry opens the Smart Column Widths settings view', async () => {
    const metadata = JSON.parse(
        await readFile(adminPanelMetadataPath, 'utf8')
    );
    const item = metadata.customization.itemList[1];

    assert.equal(item.url, '#Admin/smartColumnWidths');
    assert.equal(
        item.recordView,
        'smart-column-widths:views/admin/settings'
    );
});

test('settings expose global, administration, and per-entity activation fields', async () => {
    const metadata = JSON.parse(
        await readFile(settingsMetadataPath, 'utf8')
    );

    assert.deepEqual(
        Object.keys(metadata.fields),
        [
            'smartColumnWidthsEnabled',
            'smartColumnWidthsAdminEnabled',
            'smartColumnWidthsAllEntities',
            'smartColumnWidthsEntityList',
        ]
    );
    assert.equal(
        metadata.fields.smartColumnWidthsAdminEnabled.default,
        false
    );
    assert.equal(
        metadata.fields.smartColumnWidthsEntityList.type,
        'multiEnum'
    );

    const layout = JSON.parse(
        await readFile(settingsLayoutPath, 'utf8')
    );

    assert.deepEqual(
        layout[0].rows.map(row => row[0].name),
        [
            'smartColumnWidthsEnabled',
            'smartColumnWidthsAdminEnabled',
            'smartColumnWidthsAllEntities',
            'smartColumnWidthsEntityList',
        ]
    );
});
