// Rounding Rule Version Details - shared types

export interface RoundingRuleVersionDetailResponse {
  RoundingRuleVersionDetail: Array<{
    id: string
    version: number
    displayOrder: number
    clockingType: string
    roundingType: string
    startTime: string | null
    endTime: string | null
    gracePeriod: string | null
    roundingValue: string | null
    onlyFirstLast: boolean
  }>
}

export interface TransformedRoundingRuleVersionDetail {
  id: string
  version: number
  displayOrder: number
  clockingType: string
  roundingType: string
  startTime: string | null
  endTime: string | null
  gracePeriod: string | null
  roundingValue: string | null
  onlyFirstLast: boolean
}
