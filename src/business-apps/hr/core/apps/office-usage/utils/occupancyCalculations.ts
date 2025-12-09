/**
 * Utility functions for occupancy calculations
 */

export type OccupancyStatus = 'low' | 'moderate' | 'high' | 'over-capacity'

/**
 * Calculate occupancy percentage
 */
export const calculateOccupancy = (occupied: number, capacity: number): number => {
  if (capacity === 0) return 0
  return Math.round((occupied / capacity) * 100)
}

/**
 * Get occupancy status based on percentage
 */
export const getOccupancyStatus = (percentage: number): OccupancyStatus => {
  if (percentage < 60) return 'low'
  if (percentage < 80) return 'moderate'
  if (percentage <= 100) return 'high'
  return 'over-capacity'
}

/**
 * Get color class for occupancy status
 */
export const getOccupancyColorClass = (status: OccupancyStatus): string => {
  switch (status) {
    case 'low':
      return 'gba:text-muted-foreground'
    case 'moderate':
      return 'gba:text-info'
    case 'high':
      return 'gba:text-warning'
    case 'over-capacity':
      return 'gba:text-destructive'
  }
}

/**
 * Get background color class for occupancy status
 */
export const getOccupancyBgColorClass = (status: OccupancyStatus): string => {
  switch (status) {
    case 'low':
      return 'gba:bg-muted'
    case 'moderate':
      return 'gba:bg-info-secondary'
    case 'high':
      return 'gba:bg-warning-secondary'
    case 'over-capacity':
      return 'gba:bg-destructive-secondary'
  }
}

/**
 * Get badge variant for occupancy status
 */
export const getOccupancyBadgeVariant = (
  status: OccupancyStatus
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  switch (status) {
    case 'low':
      return 'secondary'
    case 'moderate':
      return 'info'
    case 'high':
      return 'warning'
    case 'over-capacity':
      return 'destructive'
  }
}

/**
 * Format occupancy percentage for display
 */
export const formatOccupancyPercentage = (percentage: number): string => {
  return `${percentage}%`
}

/**
 * Calculate average from array of numbers
 */
export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((acc, val) => acc + val, 0)
  return Math.round(sum / numbers.length)
}

/**
 * Find peak value and its index
 */
export const findPeak = (numbers: number[]): { value: number; index: number } => {
  if (numbers.length === 0) return { value: 0, index: -1 }

  let maxValue = numbers[0]
  let maxIndex = 0

  numbers.forEach((value, index) => {
    if (value > maxValue) {
      maxValue = value
      maxIndex = index
    }
  })

  return { value: maxValue, index: maxIndex }
}
