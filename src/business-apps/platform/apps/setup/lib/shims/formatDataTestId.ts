function isStringValid(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function formatDataTestId(prefix: string | null = '', dataTestId: string | null = ''): string {
  const previousString = isStringValid(prefix) ? `${prefix}-` : ''
  const testId = isStringValid(dataTestId) ? dataTestId : ''
  return `${previousString}${testId}`
}
