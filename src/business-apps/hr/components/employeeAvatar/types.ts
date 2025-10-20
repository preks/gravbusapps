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
  [OnlineStatus.ONLINE]: 'var(--nw-success)', // Green
  [OnlineStatus.BUSY]: 'var(--nw-destructive)', // Red
  [OnlineStatus.DO_NOT_DISTURB]: 'var(--nw-destructive)', // Red
  [OnlineStatus.AWAY]: 'var(--nw-warning)', // Orange
  [OnlineStatus.BE_RIGHT_BACK]: 'var(--nw-warning)', // Orange
  [OnlineStatus.OFFLINE]: 'var(--nw-muted-foreground)', // Grey
  [OnlineStatus.OUT_OF_OFFICE]: 'var(--nw-info)' // Purple → Info
}
