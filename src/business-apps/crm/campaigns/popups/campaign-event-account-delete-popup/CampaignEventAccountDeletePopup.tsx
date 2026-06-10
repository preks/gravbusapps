import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaignEventAccount } from '@/common/data/customer/hooks/useCustomerCampaignEventAccount'
import { MarketingEntityDeletePopup } from '../_shared/MarketingEntityDeletePopup'

export type CampaignEventAccountDeletePopupProps = BusinessAppContextProps

const useEntity = (accessToken: string, id: string | undefined) => {
  const { account, loading, error } = useCustomerCampaignEventAccount(accessToken, id)
  return {
    entity: account,
    loading,
    error,
    secondaryLine: account?.customerAccount?.name ?? null
  }
}

export const CampaignEventAccountDeletePopup: React.FC<CampaignEventAccountDeletePopupProps> = props => (
  <MarketingEntityDeletePopup
    {...props}
    idParameterKey="eventAccountId"
    payloadKey="customerCampaignEventAccount"
    dataTestId="campaign-event-account-delete-popup"
    titleKey="campaign-eventAccount-deleteTitle"
    errorContext="Failed to load event account"
    useEntity={useEntity}
  />
)

export default CampaignEventAccountDeletePopup
