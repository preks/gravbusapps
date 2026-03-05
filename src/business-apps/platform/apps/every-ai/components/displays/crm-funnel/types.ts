/**
 * CRM funnel display types (aligned with flowbot CrmFunnelData).
 */

export type CrmFunnelStageData = {
  stage: string
  stageLabel: string
  count: number
  totalAmount: number
}

export type CrmFunnelBucketData = {
  totalAmount: number
  count: number
}

export type CrmFunnelBuckets = {
  open: CrmFunnelBucketData
  inQualification: CrmFunnelBucketData
  won: CrmFunnelBucketData
  lost: CrmFunnelBucketData
}

export type CrmFunnelByOwner = {
  ownerId: string
  ownerName: string
  totalAmount: number
  count: number
}

export type CrmFunnelData = {
  type: 'crmFunnel'
  stages: CrmFunnelStageData[]
  title: string
  description: string
  dateFrom?: string
  dateTo?: string
  funnelBuckets?: CrmFunnelBuckets | null
  byOwner?: CrmFunnelByOwner[] | null
}
