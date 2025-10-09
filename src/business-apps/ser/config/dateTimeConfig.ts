/**
 * Date and Time Configuration for SER Module
 * Centralized configuration for date/time formatting throughout the Services module
 */

/**
 * Date format configuration
 * Currently hardcoded, but will be sourced from user preferences in the future
 */
export const SER_DATETIME_CONFIG = {
  /**
   * Default date format for displaying dates throughout the SER module
   * Uses Intl.DateTimeFormat options
   * Format: DD.MM.YYYY (e.g., "07.10.2025")
   * 
   * Future: This should be retrieved from user.preferences.dateFormat or similar
   */
  DEFAULT_DATE_FORMAT: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
  },
  
  /**
   * Default date-time format for displaying timestamps
   * Format: DD.MM.YYYY, HH:MM (e.g., "07.10.2025, 14:30")
   */
  DEFAULT_DATETIME_FORMAT: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    hour12: false as const,
  },
  
  /**
   * Default time-only format for displaying time values
   * Format: HH:MM (e.g., "14:30")
   */
  DEFAULT_TIME_FORMAT: {
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    hour12: false as const,
  },
  
  /**
   * Locale for date formatting
   * Using 'de-DE' to get DD.MM.YYYY format with dots as separators
   * Future: This should be retrieved from user.preferences.locale or similar
   */
  DEFAULT_LOCALE: 'de-DE',
} as const;

/**
 * Helper function to format dates using the configured format
 * 
 * @param date - Date to format (Date object, string, or number)
 * @param options - Optional override for date format options
 * @param locale - Optional override for locale
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  const dateObj = new Date(date);
  const formatOptions = options || SER_DATETIME_CONFIG.DEFAULT_DATE_FORMAT;
  const formatLocale = locale || SER_DATETIME_CONFIG.DEFAULT_LOCALE;
  
  return dateObj.toLocaleDateString(formatLocale, formatOptions);
};

/**
 * Helper function to format date-time using the configured format
 * 
 * @param date - Date to format (Date object, string, or number)
 * @param options - Optional override for date-time format options
 * @param locale - Optional override for locale
 * @returns Formatted date-time string
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  const dateObj = new Date(date);
  const formatOptions = options || SER_DATETIME_CONFIG.DEFAULT_DATETIME_FORMAT;
  const formatLocale = locale || SER_DATETIME_CONFIG.DEFAULT_LOCALE;
  
  return dateObj.toLocaleString(formatLocale, formatOptions);
};

/**
 * Helper function to format time-only using the configured format
 * 
 * @param date - Date to format (Date object, string, or number)
 * @param options - Optional override for time format options
 * @param locale - Optional override for locale
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  const dateObj = new Date(date);
  const formatOptions = options || SER_DATETIME_CONFIG.DEFAULT_TIME_FORMAT;
  const formatLocale = locale || SER_DATETIME_CONFIG.DEFAULT_LOCALE;
  
  return dateObj.toLocaleTimeString(formatLocale, formatOptions);
};

/**
 * Future enhancement: Function to get user-specific date format
 * This will be implemented when user preferences are available
 * 
 * @param userInfo - User information object
 * @returns User-specific date format options
 */
export const getUserDateFormat = (_userInfo?: any): Intl.DateTimeFormatOptions => {
  // TODO: Implement user preference lookup
  // return _userInfo?.preferences?.dateFormat || SER_DATETIME_CONFIG.DEFAULT_DATE_FORMAT;
  return SER_DATETIME_CONFIG.DEFAULT_DATE_FORMAT;
};

/**
 * Future enhancement: Function to get user-specific time format
 * This will be implemented when user preferences are available
 * 
 * @param userInfo - User information object
 * @returns User-specific time format options
 */
export const getUserTimeFormat = (_userInfo?: any): Intl.DateTimeFormatOptions => {
  // TODO: Implement user preference lookup
  // return _userInfo?.preferences?.timeFormat || SER_DATETIME_CONFIG.DEFAULT_TIME_FORMAT;
  return SER_DATETIME_CONFIG.DEFAULT_TIME_FORMAT;
};

/**
 * Future enhancement: Function to get user-specific locale
 * This will be implemented when user preferences are available
 * 
 * @param userInfo - User information object
 * @returns User-specific locale string
 */
export const getUserLocale = (_userInfo?: any): string => {
  // TODO: Implement user preference lookup
  // return _userInfo?.preferences?.locale || SER_DATETIME_CONFIG.DEFAULT_LOCALE;
  return SER_DATETIME_CONFIG.DEFAULT_LOCALE;
};
