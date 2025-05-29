/**
 * Enums and types for employee avatar status and availability
 */

/**
 * Enum for employee online status
 */
export enum OnlineStatus {
  ONLINE = 'Online',
  BUSY = 'Busy',
  DO_NOT_DISTURB = 'Do not Disturb',
  AWAY = 'Away',
  BE_RIGHT_BACK = 'Be right back',
  OFFLINE = 'Offline',
  OUT_OF_OFFICE = 'Out of Office'
}

/**
 * Enum for employee availability location
 */
export enum AvailabilityLocation {
  UNSPECIFIED = 'Unspecified',
  OFFICE = 'Office',
  REMOTE = 'Remote',
  TRIP = 'Trip'
}

/**
 * Map of online status to colors
 */
export const ONLINE_STATUS_COLORS: Record<OnlineStatus, string> = {
  [OnlineStatus.ONLINE]: '#22c55e', // Green
  [OnlineStatus.BUSY]: '#ef4444', // Red
  [OnlineStatus.DO_NOT_DISTURB]: '#ef4444', // Red
  [OnlineStatus.AWAY]: '#f97316', // Orange
  [OnlineStatus.BE_RIGHT_BACK]: '#f97316', // Orange
  [OnlineStatus.OFFLINE]: '#9ca3af', // Grey
  [OnlineStatus.OUT_OF_OFFICE]: '#a855f7' // Purple
};
