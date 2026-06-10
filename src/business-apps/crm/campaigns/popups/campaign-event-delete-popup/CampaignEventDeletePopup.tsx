import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignEntityById } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_EVENT_BY_ID } from '@/common/data/customer/queries/customerCampaignEventQueries'
import type { CustomerCampaignEvent } from '@/common/data/customer/types/customerCampaignEventTypes'
import { MarketingEntityDeletePopup } from '../_shared/MarketingEntityDeletePopup'

export type CampaignEventDeletePopupProps = BusinessAppContextProps

const useEntity = (accessToken: string, id: string | undefined) => {
  const { entity, loading, error } = useCampaignEntityById<CustomerCampaignEvent>(
    accessToken,
    id,
    GET_CAMPAIGN_EVENT_BY_ID(),
    'CustomerCampaignEventByPk',
    'Failed to load event'
  )
  return {
    entity,
    loading,
    error,
    secondaryLine: entity?.name ?? null
  }
}

export const CampaignEventDeletePopup: React.FC<CampaignEventDeletePopupProps> = props => (
  <MarketingEntityDeletePopup
    {...props}
    idParameterKey="eventId"
    payloadKey="customerCampaignEvent"
    dataTestId="campaign-event-delete-popup"
    titleKey="campaign-events-deleteTitle"
    confirmQuestionKey="campaign-events-deleteConfirm"
    errorContext="Failed to load campaign event"
    useEntity={useEntity}
  />
)

export default CampaignEventDeletePopup
