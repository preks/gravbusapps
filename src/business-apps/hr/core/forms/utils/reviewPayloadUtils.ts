import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export type ReviewNumericValue = number | string | null

export const getTaskPayload = (additionalData: BusinessAppContextProps['additionalData']): Record<string, any> =>
  additionalData?.psi_taskPayload || {}

export const getNestedValue = <T = unknown>(source: Record<string, any>, paths: string[]): T | undefined => {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((currentValue, key) => currentValue?.[key], source)

    if (value !== null && value !== undefined) {
      return value as T
    }
  }

  return undefined
}

export const getEmployeeIdFromReviewPayload = (
  payload: Record<string, any>,
  additionalData: BusinessAppContextProps['additionalData'],
  payloadPaths: string[]
): string | undefined =>
  getNestedValue<string>(payload, payloadPaths) ||
  additionalData?.employeeId ||
  additionalData?.psi_processMetadata?.inputs?.employeeId

export const formatReviewDate = (value?: string | null): string => {
  if (!value) return ''
  const datePart = value.includes('T') ? value.split('T')[0] : value
  const date = new Date(datePart)

  return Number.isNaN(date.getTime()) ? datePart : date.toLocaleDateString()
}

export const hasAnyReviewValue = (data: object): boolean =>
  Object.values(data).some(value => value !== null && value !== undefined && value !== '')
