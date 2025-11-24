export interface UserInfoProps {
  id: string
  userName: string
  givenName: string
  familyName: string
  nickName: string
  tenantId?: string
  employeeDetails: {
    employeeId: string
    firstName: string
    lastName: string
    supervisor: {
      id: string
      firstName: string
      lastName: string
      userId: string
    }
    organizationalUnit: {
      id: string
      name: string
    }
  }
}

import React, { useContext } from 'react'

export interface BusinessAppContextProps {
  accessToken: string
  userInfo?: UserInfoProps
  additionalData?: { [k: string]: any }
}

/**
 * Extracts structured data from additionalData
 * Handles nested structures like psi_taskPayload.psi_initialParameters
 * @param additionalData - The additionalData object from BusinessAppContext
 * @returns Record with extracted values (e.g., accountId, contactId, etc.)
 */
export const extractAdditionalData = (additionalData?: { [k: string]: any }): Record<string, any> => {
  if (!additionalData) return {}

  const additionalDataRecord = additionalData as Record<string, any>
  const nested =
    additionalDataRecord?.psi_taskPayload?.psi_initialParameters || additionalDataRecord?.psi_initialParameters || {}

  return {
    ...nested,
    // Direct values take precedence over nested values
    activityId: additionalDataRecord?.activityId || nested?.activityId,
    accountId: additionalDataRecord?.accountId || nested?.accountId,
    contactId: additionalDataRecord?.contactId || nested?.contactId,
    opportunityId: additionalDataRecord?.opportunityId || nested?.opportunityId,
    leadId: additionalDataRecord?.leadId || nested?.leadId,
    taskId: additionalDataRecord?.taskId || nested?.taskId,
    investmentId: additionalDataRecord?.investmentId || nested?.investmentId,
    // Include all other nested values
    ...Object.fromEntries(
      Object.entries(nested).filter(
        ([key]) =>
          !['activityId', 'accountId', 'contactId', 'opportunityId', 'leadId', 'taskId', 'investmentId'].includes(key)
      )
    )
  }
}

// Create and export the context object
export const BusinessAppContext = React.createContext<BusinessAppContextProps | null>(null)

export const useBusinessAppContext = (): BusinessAppContextProps => {
  const context = useContext(BusinessAppContext)
  if (context === null) {
    throw new Error('useBusinessAppContext must be used within a BusinessAppProvider')
  }
  return context
}
