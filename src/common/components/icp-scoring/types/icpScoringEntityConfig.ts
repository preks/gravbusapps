import type { IcpScoringEntityType } from './icpScoringTypes'

export type IcpScoringEntityLabels = {
  title: string
  description: string
  embeddedDescription: string
  singleMode: string
  bulkMode: string
  icpSelect: string
  icpPlaceholder: string
  noProfilesTitle: string
  noProfilesDescription: string
  profileLoadError: string
  singleEntityId: string
  singleEntityIdPlaceholder: string
  singleValidationError: string
  singleSuccess: string
  runSingle: string
  bulkEntityIds: string
  bulkEntityIdsPlaceholder: string
  bulkEntityIdsHint: string
  prefilledEntityCountMessage: (count: number) => string
  bulkValidationError: string
  bulkSuccess: string
  runBulk: string
  clear: string
  loading: string
  singleScoreErrorFallback: string
  bulkScoreErrorFallback: string
  authError: string
}

export interface IcpScoringEntityConfig {
  entityType: IcpScoringEntityType
  dataTestIdPrefix: string
  labels: IcpScoringEntityLabels
  /** When false, bulk mode and bulk selection UI are hidden (single-entity scoring only). */
  bulkEnabled?: boolean
}
