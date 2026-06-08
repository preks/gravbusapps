import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignEntityById } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_CONTENT_BY_ID } from '@/common/data/customer/queries/customerCampaignContentQueries'
import type { CustomerCampaignContent } from '@/common/data/customer/types/customerCampaignContentTypes'
import { MarketingEntityDeletePopup } from '../_shared/MarketingEntityDeletePopup'

export type CampaignContentDeletePopupProps = BusinessAppContextProps

const useEntity = (accessToken: string, id: string | undefined) => {
  const { entity, loading, error } = useCampaignEntityById<CustomerCampaignContent>(
    accessToken,
    id,
    GET_CAMPAIGN_CONTENT_BY_ID(),
    'CustomerCampaignContentByPk',
    'Failed to load content'
  )
  return {
    entity,
    loading,
    error,
    secondaryLine: entity?.title ?? null
  }
}

export const CampaignContentDeletePopup: React.FC<CampaignContentDeletePopupProps> = props => (
  <MarketingEntityDeletePopup
    {...props}
    idParameterKey="contentId"
    payloadKey="customerCampaignContent"
    dataTestId="campaign-content-delete-popup"
    titleKey="campaign-content-deleteTitle"
    confirmQuestionKey="campaign-content-deleteConfirm"
    errorContext="Failed to load campaign content"
    useEntity={useEntity}
  />
)

export default CampaignContentDeletePopup
