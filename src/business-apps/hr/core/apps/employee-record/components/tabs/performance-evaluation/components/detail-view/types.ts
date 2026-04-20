export interface PerformanceEvaluationCurrentEmployee {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
}

export interface PerformanceCycleGoalsSummary {
  total: number
  achieved: number
  onTrack: number
  behind: number
  averageProgressPercent: number
}

export interface ReviewerIdentity {
  key: string
  tooltipLabel: string
  displayText: string
  pictureThumbnail?: string | null
}

export interface ReviewerFallbackIdentity {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
}

export interface CarouselEntry {
  item: Record<string, unknown>
  subtitle: string
  testId: string
}

export interface RadarDataPoint {
  label: string
  self: number
  peer: number
  manager: number
}

export type ReviewerKey = 'self' | 'peer' | 'manager'

export const REVIEWER_KEYS: ReviewerKey[] = ['self', 'peer', 'manager']

export const REVIEWER_COLORS = {
  self: 'var(--nw-chart-1)',
  peer: 'var(--nw-chart-2)',
  manager: 'var(--nw-chart-3)'
}

export interface DetailViewComputedData {
  companyValueItems: Record<string, unknown>[]
  skillItems: Record<string, unknown>[]
  overallNumericDisplay: string
  ratingScaleLimit: number
  overallProgressPercent: number
  companyValuesAverageScore: string
  skillsAverageScore: string
  overallNumericChangeSinceLastReview: string
  companyValuesProgressPercent: number
  skillsProgressPercent: number
  radarMaxDomain: number
  overallChangeBadge: { text: string; className: string } | null
  companyValuesChangeBadge: { text: string; className: string } | null
  skillsChangeBadge: { text: string; className: string } | null
  companyValuesRadarData: RadarDataPoint[]
  skillsRadarData: RadarDataPoint[]
  activeReviewerKeys: ReviewerKey[]
  combinedCarouselEntries: CarouselEntry[]
  selfReviewerFallback?: ReviewerFallbackIdentity
  managerReviewerFallback?: ReviewerFallbackIdentity
}
