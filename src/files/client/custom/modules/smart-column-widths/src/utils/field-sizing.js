export const FIELD_MINIMUM_WIDTH = 56;

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
        const contentWidth = Math.max(
            measureText(element),
            measureControls(element)
        );

        return Math.max(
            width,
            contentWidth + padding
        );
    }, minimum);

    return Math.min(maximum, Math.max(minimum, Math.ceil(measured + 8)));
}
