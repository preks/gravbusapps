import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EmployeeTerminationProvider } from './context/EmployeeTerminationContext'
import { EmployeeTerminationForm } from './components/EmployeeTerminationForm'
import FormHeader from '../components/FormHeader'
import flowSmall from '@/assets/icons/flowSmall.svg'

export const EmployeeTermination: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  // Extract employeeId from additionalData (like job-position form does)
  // Fallback to URL parameters if additionalData is not available
  const employeeId =
    additionalData?.employeeId ||
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    userInfo?.employeeDetails?.employeeId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null)
  if (!accessToken) {
    return (
      <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:p-0">
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.title', 'Employee Termination')}
          flowIconUrl={flowSmall}
          className="gba:px-6"
        />
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:px-6">
          <div className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.access_token_error_text',
              'Access token required'
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:p-0">
        <FormHeader
          title={getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.title', 'Employee Termination')}
          flowIconUrl={flowSmall}
          className="gba:px-6"
        />
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:px-6">
          <div className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.employee_id_error_text',
              'Employee ID required'
            )}
          </div>
        </div>
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
