import React, { useMemo } from 'react'
import { OpportunityFormProvider } from '../../opportunity-form/context/OpportunityFormContext'
import OpportunityFormComponent from '../../opportunity-form/components/OpportunityFormComponent'
import OpportunityFormChangeMonitor from './OpportunityFormChangeMonitor'
import { OpportunityFormValues } from '../../opportunity-form/types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface OpportunityFormWrapperProps extends BusinessAppContextProps {
  initialValues?: Partial<OpportunityFormValues>
  onFormChange?: (values: Partial<OpportunityFormValues>) => void
  onSubmit?: (values: OpportunityFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

const OpportunityFormWrapper: React.FC<OpportunityFormWrapperProps> = ({
  initialValues = {},
  onFormChange,
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = true,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Memoize businessAppContext to prevent unnecessary re-renders - must be before early return
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
    <div data-testid="opportunity-form-wrapper">
      <OpportunityFormProvider
        businessAppContext={businessAppContext}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        hideActions={hideActions}
      >
        <OpportunityFormComponent />
        <OpportunityFormChangeMonitor onFormChange={onFormChange} />
      </OpportunityFormProvider>
    </div>
  )
}

export default OpportunityFormWrapper
