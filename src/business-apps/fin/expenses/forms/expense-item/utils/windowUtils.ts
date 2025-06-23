
declare global {
  interface Window {
    lowcoder?: {
      activeStructureId?: string;
      getActiveUserLocale?: () => string;
      getCatalogValue?: (value: any) => string;
      getDateFormat?: (format:string)=>string;
      i18n?:(key:string , defaultValue: string, translationVariables :any)=>string
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
export function translate(key:string , defaultValue: string, translationVariables = {}):string {
  if (typeof window.lowcoder.i18n?.t !== 'function') {
    return defaultValue;
  }
  const translation = window.lowcoder.i18n?.t(key, translationVariables);
  return translation || defaultValue;
}