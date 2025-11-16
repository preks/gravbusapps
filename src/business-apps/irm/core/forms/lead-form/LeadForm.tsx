import React from 'react'
import { LeadFormProvider } from './context/LeadFormContext'
import LeadFormComponent from './components/LeadFormComponent'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogSelect } from '@/components/catalog-select'

interface LeadFormProps {
  initialValues?: Partial<InvestmentLead>
  onSubmit?: (lead: Partial<InvestmentLead>) => Promise<void>
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
    <CatalogSelect.Provider accessToken={accessToken}>
      <LeadFormProvider
        businessAppContext={businessAppContext}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
      >
        <LeadFormComponent />
      </LeadFormProvider>
    </CatalogSelect.Provider>
  )
}

export default LeadForm
