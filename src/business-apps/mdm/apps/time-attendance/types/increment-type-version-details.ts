// Increment Type Version Details - shared types

export interface IncrementTypeVersionDetailResponse {
  IncrementTypeVersionDetail: Array<{
    id: string
    version: number
    timeIssueType: string
    displayOrder: number
    includeBreaks: boolean
    fromAppliedDay: string
    startTime: string
    toAppliedDate: string
    endTime: string
    sumTime: string
    timeTypeId: string
    incrementCalculationType: string
    fixedValue: string | null
    includeExcludeOption: string
    alternativeIncrementTypeVersionDetailId: string | null
    checkStartBefore: boolean
    startBeforeTime: string | null
  }>
}

export interface TransformedIncrementTypeVersionDetail {
  id: string
  version: number
  timeIssueType: string
  displayOrder: number
  includeBreaks: boolean
  fromAppliedDay: string
  startTime: string
  toAppliedDate: string
  endTime: string
  sumTime: string
  timeTypeId: string
  incrementCalculationType: string
  fixedValue: string | null
  includeExcludeOption: string
  alternativeIncrementTypeVersionDetailId: string | null
  checkStartBefore: boolean
  startBeforeTime: string | null
}
