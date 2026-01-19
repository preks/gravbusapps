export const formatDataTestId = (prefix: string, suffix: string): string => {
  return `${prefix}-${suffix}`
}

export const formatSettingValue = (value: string | number | boolean, type: string): string => {
  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'number':
      return value.toString()
    case 'string':
    default:
      return value.toString()
  }
}

export const validateSettingValue = (value: string, type: string): boolean => {
  switch (type) {
    case 'number':
      return !isNaN(Number(value))
    case 'boolean':
      return ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())
    case 'string':
    default:
      return true
  }
}
