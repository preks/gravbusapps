// Table sorting and pagination types
export type ActivitySortField = 'title' | 'type' | 'occurredAt' | 'createdAt' | 'activityScore' | ''
export type SortOrder = 'ASC' | 'DESC'

// Activity table state interface
export interface ActivityTableState {
  search: string
  sortField: ActivitySortField
  sortOrder: SortOrder
  currentPage: number
  pageSize: number
}

// Activity table data response
export interface ActivityTableResponse {
  activities: any[]
  total: number
  hasMore: boolean
  loading: boolean
  error: Error | null
}

// Activity type colors for UI
export const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  Call: '#1890ff', // Blue
  Email: '#52c41a', // Green
  Meeting: '#722ed1', // Purple
  Task: '#fa8c16' // Orange
}

// Activity score colors based on performance
export const ACTIVITY_SCORE_COLORS = {
  excellent: '#52c41a', // Green (90-100%)
  good: '#1890ff', // Blue (70-89%)
  average: '#fa8c16', // Orange (50-69%)
  poor: '#ff4d4f' // Red (0-49%)
}

// Helper function to get activity score color
export const getActivityScoreColor = (score: number): string => {
  if (score >= 90) return ACTIVITY_SCORE_COLORS.excellent
  if (score >= 70) return ACTIVITY_SCORE_COLORS.good
  if (score >= 50) return ACTIVITY_SCORE_COLORS.average
  return ACTIVITY_SCORE_COLORS.poor
}

// Helper function to get activity score badge variant
export const getActivityScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (score >= 90) return 'default' // Green
  if (score >= 70) return 'secondary' // Blue
  if (score >= 50) return 'outline' // Orange
  return 'destructive' // Red
}
