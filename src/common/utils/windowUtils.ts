export function getCurrentActiveStructureId(): string {
  if (window?.lowcoder?.activeStructureId) {
    return window.lowcoder.activeStructureId;
  }
  return "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf";
}

/**
 * Returns the context object cotaining several
 * IDs of the logged-in user like: employeeId,
 * structureId, organizationalUnitId, managerId.
 *
 * @returns {Object} context - The context object.
 * @returns {uuid} context.employeeId - The logged-in employeeId.
 * @returns {uuid} context.structureId - The structureId of the employee.
 * @returns {uuid} context.organizationalUnitId - The organizationalUnitId of the employee.
 * @returns {uuid} context.managerId - The employeeId of the manager.
 * @returns {uuid} context.locationId - The locationId of the manager.
 */
export function getPlatformContext() {
  if (window.lowcoder?.platformContext) {
    return window.lowcoder.platformContext;
  }
  return { structureId: getCurrentActiveStructureId() ?? "" };
}

export function getCurrentActiveUserLocale(): string {
  if (window?.lowcoder?.getActiveUserLocale) {
    return window.lowcoder.getActiveUserLocale();
  }
  return "en-US";
}

export function getCatalogValue(catalogInput: any): string {
  if (window?.lowcoder?.getCatalogValue) {
    return window.lowcoder.getCatalogValue(catalogInput);
  }
  return catalogInput.value;
}

export function getDateFormat(format:string):string{
  if(window?.lowcoder?.getDateFormat)
    return window.lowcoder.getDateFormat(format)
  return "DD.MM.YYYY"
}

export function getTranslationFromI18nKeyAndLabel(i18nKey: string, label: string = i18nKey): string {
  try {
    return window?.lowcoder?.i18n?.t(i18nKey, label) || label;
  } catch {
    return label;
  }
}