// Declare the lowcoder property on the window object
declare global {
  interface Window {
    lowcoder?: {
      activeStructureId?: string;
      getActiveUserLocale?: () => string;
      getCatalogValue?: (value: any) => string;
    };
  }
}

/**
 * Gets the current active structure ID from the window.lowcoder object
 * @returns The active structure ID or a default value
 */
export function getCurrentActiveStructureId(): string {
  if (window?.lowcoder?.activeStructureId) {
    return window.lowcoder.activeStructureId;
  }
  return "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf";
}

/**
 * Gets the current active user locale from the window.lowcoder object
 * @returns The active user locale or a default value
 */
export function getCurrentActiveUserLocale(): string {
  if (window?.lowcoder?.getActiveUserLocale) {
    return window.lowcoder.getActiveUserLocale();
  }
  return "en-US";
}

/**
 * Gets the catalog value from the window.lowcoder object
 * @param catalogInput The catalog input object
 * @returns The catalog value or the input's value property
 */
export function getCatalogValue(catalogInput: any): string {
  if (window?.lowcoder?.getCatalogValue) {
    return window.lowcoder.getCatalogValue(catalogInput);
  }
  return catalogInput.value;
}
