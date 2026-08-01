const DRAG_PREVIEW_PADDING = 8;

/**
 * Get the visible label to show in the reorder preview.
 *
 * @param {HTMLElement|null} header
 * @return {string}
 */
export function getHeaderLabel(header) {
    if (!header) {
        return '';
    }

    const content = header.innerText || header.textContent || '';
    const text = typeof content === 'string' ?
        content.replace(/\s+/g, ' ').trim() :
        '';

    if (text) {
        return text;
    }

    const ariaLabel = header.getAttribute?.('aria-label')?.trim();

    return ariaLabel || header.dataset?.name || '';
}

/**
 * Keep the pointer-following preview inside the viewport where possible.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} previewWidth
 * @param {number} previewHeight
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @param {number} [pointerOffsetX]
 * @param {number} [pointerOffsetY]
 * @return {{left: number, top: number}}
 */
export function getDragPreviewPosition(
    clientX,
    clientY,
    previewWidth,
    previewHeight,
    viewportWidth,
    viewportHeight,
    pointerOffsetX = 0,
    pointerOffsetY = 0
) {
    const preferredLeft = clientX - pointerOffsetX;
    const preferredTop = clientY - pointerOffsetY;
    const maxLeft = Math.max(
        DRAG_PREVIEW_PADDING,
        viewportWidth - previewWidth - DRAG_PREVIEW_PADDING
    );
    const maxTop = Math.max(
        DRAG_PREVIEW_PADDING,
        viewportHeight - previewHeight - DRAG_PREVIEW_PADDING
    );

    return {
        left: Math.round(Math.min(
            maxLeft,
            Math.max(DRAG_PREVIEW_PADDING, preferredLeft)
        )),
        top: Math.round(Math.min(
            maxTop,
            Math.max(DRAG_PREVIEW_PADDING, preferredTop)
        )),
    };
}
