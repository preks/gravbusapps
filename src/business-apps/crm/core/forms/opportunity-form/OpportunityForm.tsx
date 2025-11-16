import React from 'react'
import OpportunityFormComponent from './components/OpportunityFormComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface OpportunityFormProps {
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

const OpportunityForm: React.FC<BusinessAppContextProps & OpportunityFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData
  }

  return (
    <OpportunityFormComponent
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  )
}

export default OpportunityForm
