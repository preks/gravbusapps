import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ExternalContextData {
  employeeId?: string
}

interface AdditionalDataWithContext {
  externalContextData?: ExternalContextData
  contextData?: { employeeId?: string }
  psi_taskPayload?: {
    employeeId?: string
    initialParameters?: { employeeId?: string }
    psi_initialParameters?: {
      employeeId?: string
    }
  }
  employeeId?: string
}

/**
 * Extracts employee ID from business app context with priority:
 * 1. externalContextData (from AppAction) - highest priority
 * 2. contextData.employeeId (flow/screen context)
 * 3. process payload (psi_taskPayload.employeeId)
 * 4. process initial parameters (psi_taskPayload.psi_initialParameters.employeeId, then initialParameters.employeeId)
 * 5. direct additionalData.employeeId
 * 6. userInfo.employeeDetails.employeeId
 * 7. employee.code or employee.id (if employee object provided)
 * 8. empty string (fallback)
 *
 * @param additionalData - Additional data from BusinessAppContext
 * @param userInfo - User information from BusinessAppContext
 * @param employee - Optional employee object with code or id
 * @returns Employee ID string or empty string if not found
 */
export const extractEmployeeId = (
  additionalData: BusinessAppContextProps['additionalData'],
  userInfo?: BusinessAppContextProps['userInfo'],
  employee?: { code?: string; id?: string } | null
): string => {
  const externalContext: ExternalContextData = (additionalData as AdditionalDataWithContext)?.externalContextData || {}

  return (
    externalContext?.employeeId || // From AppAction externalContextData (highest priority)
    (additionalData as AdditionalDataWithContext)?.contextData?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.psi_taskPayload?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.psi_taskPayload?.initialParameters?.employeeId ||
    (additionalData as AdditionalDataWithContext)?.employeeId ||
    userInfo?.employeeDetails?.employeeId ||
    employee?.code ||
    employee?.id ||
    ''
  )
}
