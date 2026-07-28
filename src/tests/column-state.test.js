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
    fitColumnWidths,
    findHeaderAtResizeBoundary,
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

test('an empty preference restores administrator order and widths', () => {
    const state = reconcileState(null, [
        {name: 'name', widthPx: 220},
        {name: 'status', width: 20},
        {name: 'assignedUser'},
    ]);

    assert.deepEqual(state.order, ['name', 'status', 'assignedUser']);
    assert.deepEqual(state.widths, {});
});

test('all field types share the same compact minimum width', () => {
    assert.equal(getFieldMinimumWidth('name', 'varchar'), 56);
    assert.equal(getFieldMinimumWidth('emailAddress', 'email'), 56);
    assert.equal(getFieldMinimumWidth('amount', 'float'), 56);
    assert.equal(getFieldMinimumWidth('custom', 'unknown'), 56);
    assert.equal(constrainWidth(22.4, 56), 56);
    assert.equal(constrainWidth(147.6, 56), 148);
});

test('reset widths fit the viewport without horizontal overflow', () => {
    const fitted = fitColumnWidths(
        {name: 240, status: 140, emailAddress: 220},
        420,
        56
    );

    assert.ok(Object.values(fitted).every(width => width >= 56));
    assert.ok(
        Object.values(fitted).reduce((sum, width) => sum + width, 0) <= 420
    );
});

test('reset can go below the resize minimum when columns cannot fit', () => {
    const fitted = fitColumnWidths(
        {name: 100, status: 100, emailAddress: 100},
        120,
        56
    );

    assert.deepEqual(fitted, {
        name: 40,
        status: 40,
        emailAddress: 40,
    });
});

test('resize boundaries are easy to hit from both sides', () => {
    const status = {
        getBoundingClientRect: () => ({left: 40, right: 140}),
    };
    const pipeline = {
        getBoundingClientRect: () => ({left: 140, right: 260}),
    };

    assert.equal(
        findHeaderAtResizeBoundary([status, pipeline], 129, false),
        status
    );
    assert.equal(
        findHeaderAtResizeBoundary([status, pipeline], 151, false),
        status
    );
    assert.equal(
        findHeaderAtResizeBoundary([status, pipeline], 153, false),
        null
    );
    assert.equal(
        findHeaderAtResizeBoundary([status, pipeline], 151, true),
        pipeline
    );
});
