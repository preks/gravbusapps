/**
 * Performance coloring/sign helpers shared by table cells and list aggregate bar.
 * Kept free of design-system imports so Jest can test consumers in isolation.
 */
export const getPerformanceColorClass = (value: number, type: 'amount' | 'percentage'): string => {
  if (value === 0) {
    return type === 'amount' ? 'gba:text-gray-500' : 'gba:text-gray-400'
  }
  if (value > 0) {
    return type === 'amount' ? 'gba:text-green-600' : 'gba:text-green-500'
  }
  return type === 'amount' ? 'gba:text-red-600' : 'gba:text-red-500'
}

export const getPerformanceSign = (isZero: boolean, isPositive: boolean): string => {
  if (isZero) return ''
  if (isPositive) return '+'
  return '-'
}
