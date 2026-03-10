export const PREVALIDATE_ERROR_LABELS: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Insufficient balance for this period',
  INVALID_DATE_RANGE: 'Invalid date range (overlap or out-of-window)',
  INVALID_REQUEST: 'Invalid request',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to validate this absence',
  INTERNAL_ERROR: 'Could not validate — please try again'
}

export const getPrevalidateErrorLabel = (errorCode: string): string => {
  return PREVALIDATE_ERROR_LABELS[errorCode] ?? errorCode
}
