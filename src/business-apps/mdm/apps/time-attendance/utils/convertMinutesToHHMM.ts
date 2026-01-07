/**
 * Converts total minutes to HH:MM format
 * Can handle values > 24:00 (e.g., 671 minutes = 11:11, 3621 minutes = 60:21)
 *
 * @param minutes - Total minutes as number or string (can be null)
 * @returns Time in HH:MM format (e.g., "11:11", "60:21") or null if invalid
 */
export const convertMinutesToHHMM = (minutes: number | string | null): string | null => {
  if (minutes === null || minutes === undefined || minutes === '') {
    return null
  }

  // Convert to number if string
  const totalMinutes = typeof minutes === 'string' ? Number.parseInt(minutes, 10) : minutes

  // Validate it's a valid number
  if (isNaN(totalMinutes) || totalMinutes < 0) {
    return null
  }

  // Calculate hours and minutes
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  // Format as HH:mm (can be > 24:00)
  const hoursStr = hours.toString().padStart(2, '0')
  const minutesStr = remainingMinutes.toString().padStart(2, '0')

  return `${hoursStr}:${minutesStr}`
}
