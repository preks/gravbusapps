/**
 * Generic helper to resolve values from object using dot notation paths
 * Supports array access, JSON parsing of additionalProperties, and special object handling
 */
export const getValueByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined

  const parts = path.split('.')

  return parts.reduce((current, key, index) => {
    if (current && typeof current === 'object') {
      // Handle array access with bracket notation (e.g., "foo[0]")
      const bracketMatch = key.match(/^([^\[]+)\[(\d+)\]$/)
      if (bracketMatch) {
        const [, arrKey, idxStr] = bracketMatch
        const arr = current[arrKey]
        return Array.isArray(arr) ? arr[Number(idxStr)] : undefined
      }

      // Handle array access when current is an array (e.g., realEstateInvestment[0].buildingYear)
      if (Array.isArray(current)) {
        return current[0]?.[key]
      }

      // Special handling for additionalProperties - parse JSON if it's a string
      if (key === 'additionalProperties' && typeof current[key] === 'string') {
        try {
          const parsed = JSON.parse(current[key])
          // If this is the last key in the path, return the whole parsed object
          if (index === parts.length - 1) {
            return parsed
          }
          // Otherwise, continue navigation through the parsed object with remaining path parts
          const remainingPath = parts.slice(index + 1).join('.')
          return getValueByPath(parsed, remainingPath)
        } catch (error) {
          console.warn('Failed to parse additionalProperties JSON:', current[key], error)
          return undefined
        }
      }

      return current[key] !== undefined ? current[key] : undefined
    }
    return undefined
  }, obj)
}
