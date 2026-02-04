/** Shared types for performance evaluation and tab components. */

export type FrequencyType = 'Annual' | 'Quarterly' | 'Custom'
export type ParticipantType = 'Self' | 'Peer' | 'Manager'

export type CycleStatus = 'Active' | 'Upcoming' | 'Inactive'

export interface EvaluationStage {
  id: string
  type: ParticipantType
  label: string
}

export interface PerformanceCycle {
  id: string
  version?: number
  name: string
  startDate: string
  endDate: string
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  status: CycleStatus
  deactivated?: boolean
  recordState?: string
  ratingScaleId?: string
  valueIds?: string[]
  /** Raw API participants with id/version for updates */
  _apiParticipants?: Array<{
    id: string
    version: number | null
    participantType: string | null
    enabled: boolean | null
  }>
  /** Raw API company values with id/version for updates */
  _apiCompanyValues?: Array<{ id: string; version: number | null; companyValueId: string | null }>
}

export interface RatingScale {
  id: string
  version?: number
  name: string
  values: string[]
}

export interface ValueItemStored {
  id: string
  version?: number
  title: string
  description: string
  recordState: string
}
