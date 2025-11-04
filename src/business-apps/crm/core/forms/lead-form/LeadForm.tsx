import React, { useMemo, useCallback } from 'react'
import { LeadFormProvider } from './context/LeadFormContext'
import LeadFormComponent from './components/LeadFormComponent'
import { LeadFormValues } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface LeadFormProps {
  initialValues?: Partial<LeadFormValues>
  onSubmit?: (values: LeadFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}

const LeadForm: React.FC<BusinessAppContextProps & LeadFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Memoize callbacks to prevent unnecessary re-renders
  const handleSubmit = useCallback(
    async (values: LeadFormValues) => {
      if (onSubmit) {
        await onSubmit(values)
      }
    },
    [onSubmit]
  )

  const handleCancel = useCallback(async () => {
    if (onCancel) {
      await onCancel()
    }
  }, [onCancel])

  // Memoize businessAppContext to prevent unnecessary re-renders
  const businessAppContext: BusinessAppContextProps = useMemo(
    () => ({
      accessToken,
      userInfo,
      additionalData
    }),
    [accessToken, userInfo, additionalData]
  )

  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  return (
    <LeadFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    >
      <LeadFormComponent />
    </LeadFormProvider>
  )
}

export default LeadForm
