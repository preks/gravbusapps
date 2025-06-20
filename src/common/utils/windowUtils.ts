
declare global {
  interface Window {
    lowcoder?: {
      activeStructureId?: string;
      getActiveUserLocale?: () => string;
      getCatalogValue?: (value: any) => string;
      getDateFormat?: (format:string)=>string;
      getTranslationFromI18nKeyAndLabel?: (key: string, defaultValue: string, translationVariables?: {}) => string;
      formatDate?: (dateValue: Date | string | undefined, format?: string, customSpecificFormat?: string) => string | undefined;
    };
  }
}

export function getCurrentActiveStructureId(): string {
  if (window?.lowcoder?.activeStructureId) {
    return window.lowcoder.activeStructureId;
  }
  return "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf";
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
  const translation = window?.lowcoder?.i18n?.t(key, translationVariables);
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