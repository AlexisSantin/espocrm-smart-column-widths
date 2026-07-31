export const FIELD_MINIMUM_WIDTH = 56;
export const RESIZE_HIT_TOLERANCE = 12;
export const RESIZE_OUTSIDE_HIT_TOLERANCE = 6;

/**
 * @return {number}
 */
export function getFieldMinimumWidth() {
    return FIELD_MINIMUM_WIDTH;
}

/**
 * @param {number} value
 * @param {number} minimum
 * @return {number}
 */
export function constrainWidth(value, minimum) {
    return Math.max(minimum, Math.round(value));
}

/**
 * Keep real columns fixed and assign only unused space to a filler column.
 *
 * @param {number} availableWidth
 * @param {number} contentWidth
 * @return {{fillerWidth: number, tableWidth: number}}
 */
export function calculateTableSizing(availableWidth, contentWidth) {
    const fillerWidth = Math.max(0, availableWidth - contentWidth);

    return {
        fillerWidth,
        tableWidth: contentWidth + fillerWidth,
    };
}

/**
 * Fit rendered widths into the available field area. The regular resize
 * minimum is retained whenever possible. When there are too many columns,
 * the effective minimum is reduced so a reset never creates an overflow.
 *
 * @param {Record<string, number>} widthMap
 * @param {number} availableWidth
 * @param {number} minimum
 * @return {Record<string, number>}
 */
export function fitColumnWidths(widthMap, availableWidth, minimum) {
    const entries = Object.entries(widthMap)
        .filter(([, width]) => Number.isFinite(width) && width > 0);
    const budget = Math.max(0, Math.floor(availableWidth));

    if (!entries.length) {
        return {};
    }

    const total = entries.reduce((sum, [, width]) => sum + width, 0);

    if (total <= budget) {
        return Object.fromEntries(
            entries.map(([name, width]) => [name, Math.floor(width)])
        );
    }

    const effectiveMinimum = Math.min(
        minimum,
        budget / entries.length
    );
    const result = {};
    let remaining = entries.map(([name, width]) => ({name, width}));
    let remainingBudget = budget;

    while (remaining.length) {
        const remainingTotal = remaining.reduce(
            (sum, item) => sum + item.width,
            0
        );
        const scale = remainingTotal ?
            remainingBudget / remainingTotal :
            0;
        const constrained = remaining.filter(
            item => item.width * scale < effectiveMinimum
        );

        if (!constrained.length) {
            remaining.forEach(item => {
                result[item.name] = item.width * scale;
            });

            break;
        }

        constrained.forEach(item => {
            result[item.name] = effectiveMinimum;
            remainingBudget -= effectiveMinimum;
        });

        const constrainedNames = new Set(
            constrained.map(item => item.name)
        );

        remaining = remaining.filter(
            item => !constrainedNames.has(item.name)
        );
    }

    return Object.fromEntries(
        entries.map(([name]) => [
            name,
            Math.max(1, Math.floor(result[name] || 0)),
        ])
    );
}

/**
 * Find the column whose trailing edge is close enough to the pointer.
 * The first pixels beyond the edge still belong to the preceding column so
 * resizing takes priority over reordering around the visual separator.
 *
 * @param {HTMLElement[]} headers
 * @param {number} clientX
 * @param {boolean} rtl
 * @param {number} [insideTolerance]
 * @param {number} [outsideTolerance]
 * @return {HTMLElement|null}
 */
export function findHeaderAtResizeBoundary(
    headers,
    clientX,
    rtl,
    insideTolerance = RESIZE_HIT_TOLERANCE,
    outsideTolerance = RESIZE_OUTSIDE_HIT_TOLERANCE
) {
    let closest = null;
    let closestDistance = Math.max(
        insideTolerance,
        outsideTolerance
    ) + 1;

    headers.forEach(header => {
        const rect = header.getBoundingClientRect();
        const boundary = rtl ? rect.left : rect.right;
        const insideDistance = rtl ?
            clientX - boundary :
            boundary - clientX;
        const distance = Math.abs(insideDistance);

        if (
            insideDistance > insideTolerance ||
            insideDistance < -outsideTolerance ||
            distance >= closestDistance
        ) {
            return;
        }

        closest = header;
        closestDistance = distance;
    });

    return closest;
}

let measurementCanvas = null;

function measureText(element) {
    const text = (element.innerText || element.textContent || '')
        .split('\n')
        .map(value => value.trim())
        .filter(Boolean);

    if (!text.length) {
        return 0;
    }

    measurementCanvas ??= document.createElement('canvas');

    const context = measurementCanvas.getContext('2d');
    const style = window.getComputedStyle(element);

    context.font = style.font;

    return Math.max(
        ...text.map(value => context.measureText(value).width)
    );
}

function measureControls(element) {
    return [...element.querySelectorAll(
        'input, select, button, img, .fas, .far, .fab'
    )].reduce((width, control) => {
        if (
            control instanceof HTMLInputElement &&
            !['checkbox', 'radio'].includes(control.type)
        ) {
            const style = window.getComputedStyle(control);

            measurementCanvas ??= document.createElement('canvas');

            const context = measurementCanvas.getContext('2d');

            context.font = style.font;

            return width + context.measureText(
                control.value || control.placeholder || ''
            ).width;
        }

        return width + control.getBoundingClientRect().width;
    }, 0);
}

function getHorizontalSpacing(style, includePadding) {
    return [
        style.marginLeft,
        style.marginRight,
        style.borderLeftWidth,
        style.borderRightWidth,
        includePadding ? style.paddingLeft : 0,
        includePadding ? style.paddingRight : 0,
    ].reduce(
        (total, value) => total + (parseFloat(value || '0') || 0),
        0
    );
}

function measureElementWidth(element) {
    const style = window.getComputedStyle(element);

    return Math.max(
        element.scrollWidth,
        element.getBoundingClientRect().width
    ) + getHorizontalSpacing(style, false);
}

/**
 * Measure only enum decorations omitted by canvas text measurement.
 * Restricting the selectors prevents controls from other extensions from
 * changing auto-fit widths for otherwise correct text and link fields.
 *
 * @param {HTMLElement} element
 * @return {number}
 */
function measureEnumExtras(element) {
    const iconWidth = [...element.querySelectorAll('.color-icon')]
        .reduce((width, icon) => {
            const spacing = icon.nextElementSibling;
            const spacingWidth = spacing &&
                !(spacing.textContent || '').trim() ?
                measureElementWidth(spacing) :
                0;

            return width + measureElementWidth(icon) + spacingWidth;
        }, 0);
    const labelChrome = [...element.querySelectorAll('.label')]
        .reduce(
            (width, label) => width + getHorizontalSpacing(
                window.getComputedStyle(label),
                true
            ),
            0
        );

    return iconWidth + labelChrome;
}

/**
 * @param {number} textWidth
 * @param {number} extrasWidth
 * @param {number} controlsWidth
 * @param {number} padding
 * @return {number}
 */
export function combineContentWidths(
    textWidth,
    extrasWidth,
    controlsWidth,
    padding
) {
    return Math.max(
        textWidth + extrasWidth,
        controlsWidth
    ) + padding;
}

/**
 * @param {HTMLElement[]} elements
 * @param {number} minimum
 * @param {number} [maximum]
 * @return {number}
 */
export function measureContentWidth(elements, minimum, maximum = 520) {
    const measured = elements.reduce((width, element) => {
        const style = window.getComputedStyle(element);
        const padding =
            parseFloat(style.paddingLeft || '0') +
            parseFloat(style.paddingRight || '0');
        const contentWidth = combineContentWidths(
            measureText(element),
            measureEnumExtras(element),
            measureControls(element),
            padding
        );

        return Math.max(
            width,
            contentWidth
        );
    }, minimum);

    return Math.min(maximum, Math.max(minimum, Math.ceil(measured + 8)));
}
