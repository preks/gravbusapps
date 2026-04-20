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
    displayName?: string
    pictureThumbnail?: string
    jobTitle?: string
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

// Create and export the context object
export const BusinessAppContext = React.createContext<BusinessAppContextProps | null>(null)

export const useBusinessAppContext = (): BusinessAppContextProps => {
  const context = useContext(BusinessAppContext)
  if (context === null) {
    throw new Error('useBusinessAppContext must be used within a BusinessAppProvider')
  }
  return context
}
