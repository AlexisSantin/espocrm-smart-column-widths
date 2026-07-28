import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyOrderToLayout,
    getEligibleLayoutItems,
    reconcileOrder,
    reconcileState,
} from '../files/client/custom/modules/smart-column-widths/src/utils/column-state.js';
import {
    constrainWidth,
    getFieldMinimumWidth,
} from '../files/client/custom/modules/smart-column-widths/src/utils/field-sizing.js';

test('eligible columns follow the active administrator layout', () => {
    const items = getEligibleLayoutItems([
        {name: 'name', link: true},
        {name: 'status'},
        {name: 'internal', noLabel: true},
        {name: 'forbidden', customLabel: ''},
        {name: 'status'},
    ]);

    assert.deepEqual(
        items.map(item => item.name),
        ['name', 'status']
    );
});

test('stored order is reconciled with administrator additions and removals', () => {
    assert.deepEqual(
        reconcileOrder(
            ['emailAddress', 'removed', 'name'],
            ['name', 'status', 'emailAddress', 'assignedUser']
        ),
        ['emailAddress', 'assignedUser', 'name', 'status']
    );
});

test('version one width and order preferences are migrated', () => {
    const state = reconcileState(
        {
            version: 1,
            order: ['name'],
            widths: {name: 180, removed: 250},
        },
        [
            {name: 'name', link: true},
            {name: 'phoneNumber', hidden: true},
        ]
    );

    assert.deepEqual(state.order, ['name', 'phoneNumber']);
    assert.deepEqual(state.widths, {name: 180});
    assert.equal(state.version, 2);
});

test('applying order preserves native visibility data', () => {
    const layout = applyOrderToLayout(
        [
            {name: 'name', hidden: true},
            {name: 'status', hidden: false},
        ],
        ['status', 'name']
    );

    assert.deepEqual(
        layout.map(item => [item.name, item.hidden]),
        [
            ['status', false],
            ['name', true],
        ]
    );
});

test('all field types share the same compact minimum width', () => {
    assert.equal(getFieldMinimumWidth('name', 'varchar'), 56);
    assert.equal(getFieldMinimumWidth('emailAddress', 'email'), 56);
    assert.equal(getFieldMinimumWidth('amount', 'float'), 56);
    assert.equal(getFieldMinimumWidth('custom', 'unknown'), 56);
    assert.equal(constrainWidth(22.4, 56), 56);
    assert.equal(constrainWidth(147.6, 56), 148);
});
