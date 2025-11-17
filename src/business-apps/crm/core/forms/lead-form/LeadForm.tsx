import React from 'react'
import LeadFormComponent from './LeadFormComponent'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface LeadFormProps {
  initialValues?: Partial<CustomerLead>
  onSubmit?: (lead: Partial<CustomerLead>) => Promise<void>
  onCancel?: () => Promise<void>
}

const LeadForm: React.FC<BusinessAppContextProps & LeadFormProps> = ({
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
    <LeadFormComponent
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  )
}

export default LeadForm
