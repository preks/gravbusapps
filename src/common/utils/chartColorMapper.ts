/**
 * Maps a numeric value to a color from a color palette based on its position
 * within a range of values (min to max).
 *
 * @param value - The value to map to a color
 * @param allValues - Array of all values in the dataset (used to find min/max)
 * @param colors - Array of color tokens to map to
 * @returns The color corresponding to the value's position in the range
 *
 * @example
 * const colors = ['var(--nw-chart-1)', 'var(--nw-chart-3)', 'var(--nw-chart-5)']
 * const values = [10, 20, 30, 40, 50]
 * mapValueToColor(10, values, colors) // returns 'var(--nw-chart-1)'
 * mapValueToColor(50, values, colors) // returns 'var(--nw-chart-5)'
 */
export function mapValueToColor(value: number, allValues: number[], colors: string[]): string {
  // Handle empty arrays
  if (allValues.length === 0 || colors.length === 0) {
    return colors[0] || 'var(--nw-chart-1)'
  }

  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)

  // If all values are the same, return the first color
  if (maxValue === minValue) {
    return colors[0]
  }

  // Calculate normalized position (0 to 1)
  const normalizedValue = (value - minValue) / (maxValue - minValue)

  // Map to color index (0 to colors.length - 1)
  const colorIndex = Math.floor(normalizedValue * (colors.length - 1))

  return colors[colorIndex]
}
