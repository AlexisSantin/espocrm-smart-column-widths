import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getDragPreviewPosition,
    getHeaderLabel,
} from '../files/client/custom/modules/better-columns/src/utils/drag-preview.js';

test('drag preview prefers the rendered header label with safe fallbacks', () => {
    assert.equal(
        getHeaderLabel({
            textContent: '  Email\n address ',
            getAttribute: () => 'Accessible label',
            dataset: {name: 'emailAddress'},
        }),
        'Email address'
    );
    assert.equal(
        getHeaderLabel({
            textContent: '',
            getAttribute: name => name === 'aria-label' ? 'Status' : null,
            dataset: {name: 'status'},
        }),
        'Status'
    );
    assert.equal(
        getHeaderLabel({
            textContent: '',
            getAttribute: () => null,
            dataset: {name: 'assignedUser'},
        }),
        'assignedUser'
    );
});

test('drag preview keeps its grab point while staying inside the viewport', () => {
    assert.deepEqual(
        getDragPreviewPosition(400, 300, 140, 32, 800, 600, 35, 12),
        {left: 365, top: 288}
    );
    assert.deepEqual(
        getDragPreviewPosition(790, 590, 140, 32, 800, 600, 20, 16),
        {left: 652, top: 560}
    );
});
