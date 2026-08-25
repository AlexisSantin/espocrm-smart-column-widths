/**
 * Keeps previous installations enabled until an administrator explicitly
 * limits the extension to selected entities.
 *
 * @param {import('models/settings').default} config
 * @param {string} entityType
 * @param {boolean} [isAdministration=false]
 * @return {boolean}
 */
export default function isSmartColumnWidthsEnabledForEntity(
    config,
    entityType,
    isAdministration = false
) {
    if (config.get('smartColumnWidthsEnabled') === false) {
        return false;
    }

    if (
        isAdministration &&
        config.get('smartColumnWidthsAdminEnabled') === false
    ) {
        return false;
    }

    if (config.get('smartColumnWidthsAllEntities') !== false) {
        return true;
    }

    const entityList = config.get('smartColumnWidthsEntityList');

    return Array.isArray(entityList) &&
        entityList.includes(entityType);
}
