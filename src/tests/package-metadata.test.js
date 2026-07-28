import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const clientMetadataPath = new URL(
    '../files/custom/Espo/Modules/SmartColumnWidths/Resources/metadata/app/client.json',
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
