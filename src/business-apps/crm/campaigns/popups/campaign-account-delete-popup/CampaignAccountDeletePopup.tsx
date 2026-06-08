import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaignAccount } from '@/common/data/customer/hooks/useCustomerCampaignAccount'
import { MarketingEntityDeletePopup } from '../_shared/MarketingEntityDeletePopup'

export type CampaignAccountDeletePopupProps = BusinessAppContextProps

const useEntity = (accessToken: string, id: string | undefined) => {
  const { account, loading, error } = useCustomerCampaignAccount(accessToken, id)
  return {
    entity: account,
    loading,
    error,
    secondaryLine: account?.customerAccount?.name ?? null
  }
}

export const CampaignAccountDeletePopup: React.FC<CampaignAccountDeletePopupProps> = props => (
  <MarketingEntityDeletePopup
    {...props}
    idParameterKey="campaignAccountId"
    fallbackIdParameterKeys={['customerCampaignAccountId', 'accountId']}
    payloadKey="customerCampaignAccount"
    dataTestId="campaign-account-delete-popup"
    titleKey="campaign-targets-deleteTitle"
    confirmQuestionKey="campaign-targets-deleteConfirm"
    errorContext="Failed to load campaign account"
    useEntity={useEntity}
  />
)

export default CampaignAccountDeletePopup
