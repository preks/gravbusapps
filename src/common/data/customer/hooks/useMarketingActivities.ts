import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_MARKETING_ACTIVITIES_CALENDAR,
  GET_MARKETING_ACTIVITIES_TIMELINE,
  type MarketingActivity
} from '@/common/data/customer/queries/campaignDashboardQueries'

interface CampaignCalendarResult {
  events?: Array<{
    id: string
    name: string
    eventDate: string
    ownerEmployee?: { displayName: string }
    customerCampaign?: CampaignRelation
  }>
  contents?: Array<{
    id: string
    title: string
    publishDate: string
    marketingChannel?: MarketingCatalogEntry
    customerCampaign?: CampaignRelation
  }>
}

interface CampaignRelation {
  id: string
  name: string
  customerCampaignStatus?: MarketingCatalogEntry
  customerCampaignSegment?: MarketingCatalogEntry
  ownerEmployee?: { displayName: string }
}

interface MarketingCatalogEntry {
  id?: string
  value?: string
  code?: string
  objectValue?: any
}

interface MarketingActivitiesRange {
  fromDate: string
  toDate: string
}

const mapEventActivity = (event: NonNullable<CampaignCalendarResult['events']>[number]): MarketingActivity => ({
  id: `event-${event.id}`,
  title: event.name,
  date: event.eventDate,
  type: 'event',
  ownerName: event.ownerEmployee?.displayName || event.customerCampaign?.ownerEmployee?.displayName,
  campaignName: event.customerCampaign?.name,
  relatedEntityId: event.customerCampaign?.id,
  relatedEntityName: event.customerCampaign?.name,
  status: event.customerCampaign?.customerCampaignStatus?.value,
  segment: event.customerCampaign?.customerCampaignSegment?.value,
  statusEntry: event.customerCampaign?.customerCampaignStatus,
  segmentEntry: event.customerCampaign?.customerCampaignSegment
})

const mapContentActivity = (content: NonNullable<CampaignCalendarResult['contents']>[number]): MarketingActivity => ({
  id: `content-${content.id}`,
  title: content.title,
  date: content.publishDate,
  type: 'content',
  ownerName: content.customerCampaign?.ownerEmployee?.displayName,
  campaignName: content.customerCampaign?.name,
  channel: content.marketingChannel?.value,
  relatedEntityId: content.customerCampaign?.id,
  relatedEntityName: content.customerCampaign?.name,
  status: content.customerCampaign?.customerCampaignStatus?.value,
  segment: content.customerCampaign?.customerCampaignSegment?.value,
  channelEntry: content.marketingChannel,
  statusEntry: content.customerCampaign?.customerCampaignStatus,
  segmentEntry: content.customerCampaign?.customerCampaignSegment
})

const mapMarketingActivities = (result: CampaignCalendarResult | null | undefined): MarketingActivity[] => [
  ...(result?.events || []).filter(event => event.eventDate).map(mapEventActivity),
  ...(result?.contents || []).filter(content => content.publishDate).map(mapContentActivity)
]

export const useMarketingActivities = (context: BusinessAppContextProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCalendarActivities = useCallback(
    async (range: MarketingActivitiesRange): Promise<MarketingActivity[]> => {
      if (!context.accessToken) {
        setIsLoading(false)
        return []
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<CampaignCalendarResult>(
          GET_MARKETING_ACTIVITIES_CALENDAR(range.fromDate, range.toDate)
        )
        return mapMarketingActivities(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marketing activities')
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  const fetchTimelineActivities = useCallback(
    async (range: MarketingActivitiesRange): Promise<MarketingActivity[]> => {
      if (!context.accessToken) {
        setIsLoading(false)
        return []
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<CampaignCalendarResult>(
          GET_MARKETING_ACTIVITIES_TIMELINE(range.fromDate, range.toDate)
        )
        return mapMarketingActivities(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marketing activities')
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchCalendarActivities, fetchTimelineActivities, isLoading, error }
}
