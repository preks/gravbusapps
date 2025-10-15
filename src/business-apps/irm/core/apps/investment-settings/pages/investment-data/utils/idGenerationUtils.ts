/**
 * Generates a collision-resistant unique ID using timestamp and random string
 */
export const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Generates a unique group ID
 */
export const generateGroupId = (): string => {
  return generateUniqueId('group')
}

/**
 * Generates a unique field ID
 */
export const generateFieldId = (): string => {
  return generateUniqueId('field')
}
