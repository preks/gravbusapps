import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CampaignFormProvider } from './context/CampaignFormContext'
import CampaignFormComponent from './components/CampaignFormComponent'
import type { CampaignFormValues } from './types'
import { CatalogSelect } from '@/components/catalog-select'

interface CampaignFormProps extends BusinessAppContextProps {
  initialValues?: Partial<CampaignFormValues>
  onSubmit?: (values: CampaignFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}

const CampaignForm: React.FC<CampaignFormProps> = ({
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
        <div className="gba:text-red-500">Error: No access token found. Please authenticate.</div>
      </div>
    )
  }

  return (
    <CatalogSelect.Provider<CampaignFormValues>
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
    >
      <CampaignFormProvider
        businessAppContext={{ accessToken, userInfo, additionalData }}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
      >
        <CampaignFormComponent />
      </CampaignFormProvider>
    </CatalogSelect.Provider>
  )
}

export default CampaignForm
