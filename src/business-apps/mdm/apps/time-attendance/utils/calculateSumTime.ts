/**
 * Calculates the Sum Time based on Day From + Start Time → Day To + End Time
 *
 * Examples:
 * - Current 10:00 Current 16:00 = 06:00
 * - Current 10:00 Next 16:00 = 30:00
 * - Before 10:00 Next 16:00 = 54:00
 * - Maximum: 71:59 Before 00:00 Next 23:59
 *
 * @param fromAppliedDay - 'BEFORE_APPLIED_DAY' | 'CURRENT_APPLIED_DAY' | 'NEXT_APPLIED_DAY'
 * @param startTime - Time in HH:mm format (e.g., "10:00")
 * @param toAppliedDate - 'BEFORE_APPLIED_DAY' | 'CURRENT_APPLIED_DAY' | 'NEXT_APPLIED_DAY'
 * @param endTime - Time in HH:mm format (e.g., "16:00")
 * @returns Sum time in HH:mm format (can be > 24:00)
 */
export const calculateSumTime = (
  fromAppliedDay: string,
  startTime: string,
  toAppliedDate: string,
  endTime: string
): string => {
  // Validate inputs
  if (!fromAppliedDay || !startTime || !toAppliedDate || !endTime) {
    return '00:00'
  }

  // Parse time strings (HH:mm format)
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return { hours: hours || 0, minutes: minutes || 0 }
  }

  const start = parseTime(startTime)
  const end = parseTime(endTime)

  // Convert day types to numeric offsets
  // Before = -1, Current = 0, Next = 1
  const getDayOffset = (dayType: string): number => {
    if (dayType === 'BEFORE_APPLIED_DAY') return -1
    if (dayType === 'CURRENT_APPLIED_DAY') return 0
    if (dayType === 'NEXT_APPLIED_DAY') return 1
    return 0
  }

  const startDayOffset = getDayOffset(fromAppliedDay)
  const endDayOffset = getDayOffset(toAppliedDate)

  // Calculate total minutes
  // Start: (startDayOffset * 24 * 60) + (start.hours * 60) + start.minutes
  // End: (endDayOffset * 24 * 60) + (end.hours * 60) + end.minutes
  // Difference: end - start

  const startTotalMinutes = startDayOffset * 24 * 60 + start.hours * 60 + start.minutes
  const endTotalMinutes = endDayOffset * 24 * 60 + end.hours * 60 + end.minutes

  let diffMinutes = endTotalMinutes - startTotalMinutes

  // Handle case where end is before start (shouldn't happen in valid scenarios, but handle gracefully)
  if (diffMinutes < 0) {
    diffMinutes = 0
  }

  // Convert minutes to hours and minutes
  const totalHours = Math.floor(diffMinutes / 60)
  const remainingMinutes = diffMinutes % 60

  // Format as HH:mm (can be > 24:00)
  const hoursStr = totalHours.toString().padStart(2, '0')
  const minutesStr = remainingMinutes.toString().padStart(2, '0')

  return `${hoursStr}:${minutesStr}`
}
