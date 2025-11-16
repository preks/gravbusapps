import React from 'react'
import OpportunityFormComponent from './components/OpportunityFormComponent'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface InvestmentOpportunityFormProps {
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

const InvestmentOpportunityForm: React.FC<BusinessAppContextProps & InvestmentOpportunityFormProps> = ({
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

export default InvestmentOpportunityForm
