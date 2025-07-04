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
  if (window?.lowcoder?.i18n && window?.lowcoder?.i18n?.selectedLocale) {
    return window?.lowcoder?.i18n?.selectedLocale;
  }
  return "en-US";
}

export function getCatalogValue(catalogEntry: any): string {
  try {
    const currentLocale = (window?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase();
    if (Array.isArray(catalogEntry.translations)) {
      const translation = catalogEntry.translations.find((t: any) => t?.localeCode?.toLowerCase() === currentLocale);
      if (translation && translation.value) return translation.value;
    }
    return catalogEntry.value || '';
  } catch {
    return catalogEntry.value || '';
  }
}

export function getDateFormat(format:string):string{
  if(window?.lowcoder?.getDateFormat)
    return window.lowcoder.getDateFormat(format)
  return "DD.MM.YYYY"
}

export function getTranslationFromI18nKeyAndLabel(key: string, defaultValue: string, translationVariables?: {}) {
  if (typeof window?.lowcoder?.i18n?.t !== 'function') {
    return defaultValue;
  }
  const translation = window?.lowcoder?.i18n?.t(key, { defaultValue, ...(translationVariables || {}) });
  if (key?.split('lowcoder:')?.[1] === translation) {
    return defaultValue;
  }
  return translation || defaultValue;
}

export const formatDate = (
  dateValue: Date | string | undefined,
  format = 'date.short',
  customSpecificFormat = null
): string | undefined => {
  if (!dateValue) return dateValue;

  const date = new Date(dateValue);

  if (typeof window?.lowcoder?.i18n?.formatDate !== 'function') {
    return date.toISOString();
  }
  

  return window?.lowcoder?.i18n?.formatDate(date, format, customSpecificFormat);
};

export const formatNumberFunction=(number :string, format :string="0.00[,]00"):string=>{
  if (!window.lowcoder?.i18n?.formatNumber || typeof window.lowcoder.i18n?.formatNumber !== 'function') {
    return number;
  }
  return window.lowcoder.i18n.formatNumber(number, format);
}

export const formatDateToISO= (dateValue:Date) : Date | string | undefined => {
  if(!dateValue)
    return ""
 try {
  if (!window?.lowcoder?.i18n?.l10nResources?.dateTime['fullDateTime.ISO']) {
    return dateValue;
  }
  if(window.lowcoder.formatDate)
  return window.lowcoder.formatDate(dateValue, 'fullDateTime.ISO');
return dateValue.toISOString()
  } catch {
    return dateValue;
  }
}