// Utility function to convert values to strings safely
export const toStringOrUndefined = (value: string | number | undefined | null): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }
  const stringValue = String(value)
  return stringValue && stringValue.trim() ? stringValue.trim() : undefined
}
