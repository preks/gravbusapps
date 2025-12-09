import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ExternalContextData {
  employeeId?: string
}

interface AdditionalDataWithContext {
  externalContextData?: ExternalContextData
  psi_taskPayload?: {
    employeeId?: string
    psi_initialParameters?: {
      employeeId?: string
    }
  }
  employeeId?: string
}

/**
 * Extracts employee ID with priority:
 * 1. externalContextData (from AppAction) - highest priority
 * 2. process payload (psi_taskPayload.employeeId)
 * 3. process initial parameters (psi_taskPayload.psi_initialParameters.employeeId)
 * 4. direct additionalData.employeeId
 * 5. userInfo.employeeDetails.employeeId
 * 6. employee.code or employee.id (if employee object provided)
 * 7. empty string (fallback)
 */
export const extractEmployeeId = (
  additionalData: BusinessAppContextProps['additionalData'],
  userInfo?: BusinessAppContextProps['userInfo'],
  employee?: { code?: string; id?: string } | null
): string => {
  const externalContext: ExternalContextData = (additionalData as AdditionalDataWithContext)?.externalContextData || {}

  return (
    externalContext?.employeeId || // From AppAction externalContextData (highest priority)
    (additionalData as AdditionalDataWithContext)?.psi_taskPayload?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.employeeId ||
    userInfo?.employeeDetails?.employeeId ||
    employee?.code ||
    employee?.id ||
    ''
  )
}
