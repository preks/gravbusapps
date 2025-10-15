import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeTerminationProvider } from './context/EmployeeTerminationContext'
import { EmployeeTerminationForm } from './components/EmployeeTerminationForm'

export const EmployeeTermination: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  // Extract employeeId from additionalData (like job-position form does)
  // Fallback to URL parameters if additionalData is not available
  const employeeId =
    additionalData?.employeeId ||
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
    userInfo?.employeeDetails?.employeeId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null)
  if (!accessToken) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-gray-500">Access token required</div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-gray-500">Employee ID required</div>
      </div>
    )
  }

  return (
    <EmployeeTerminationProvider
      employeeId={employeeId}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
    >
      <EmployeeTerminationForm />
    </EmployeeTerminationProvider>
  )
}

export default EmployeeTermination
