// Break Type Version Details - shared types

export interface BreakTypeVersionDetailResponse {
  BreakTypeVersionDetail: Array<{
    id: string
    version: number
    displayOrder: number
    type: string
    startTime: string | null
    endTime: string | null
    hours: string | null
    length: string | null
    mandatory: boolean
    payOption: string | null
    combinedWithBreakTypeVersionDetailId: string | null
  }>
}

export interface TransformedBreakTypeVersionDetail {
  id: string
  version: number
  displayOrder: number
  type: string
  startTime: string | null
  endTime: string | null
  hours: string | null
  length: string | null
  mandatory: boolean
  payOption: string | null
  combinedWithBreakTypeVersionDetailId: string | null
}
