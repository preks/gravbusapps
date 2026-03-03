import { EmployeeFeedback } from '../../../hooks/useEmployeeData'

export interface ExtendedEmployeeFeedback extends EmployeeFeedback {
  id: string
  rating?: number
  private?: boolean
  type?: string
}

export interface FormattedFeedback {
  id?: string
  sender: string
  date: string
  rawDate?: string
  content: string
  avatar?: string | null
  senderId?: string
  firstName: string
  lastName: string
  rating?: number
  private?: boolean
  feedbackPublic?: boolean | null
  type?: string
  timestamp?: number
}

export interface FeedbackRequestRow {
  id: string
  createdAt?: string | null
  dueDate?: string | null
  message?: string | null
  statusRef?: string | null
  typeRef?: string | null
  employeeId?: string | null
  requesterEmployeeId?: string | null
  requesterEmployee?: { displayName?: string | null; id?: string } | null
  employee?: { displayName?: string | null; id?: string } | null
}

export interface PendingRequestRow {
  id: string
  createdAt?: string | null
  employeeId?: string | null
  requesterEmployeeId?: string | null
  endpoint?: string | null
  processInstanceId?: string | null
  requestedOn?: string | null
  dueDate?: string | null
  message?: string | null
  requesterEmployee?: {
    id?: string | null
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    employeePosition?: {
      employee?: {
        pictureThumbnail?: string | null
      } | null
    } | null
  } | null
}

export interface FeedbackHubKpis {
  receivedTotal: number
  receivedTrend: number
  givenTotal: number
  givenTrend: number
  distinctContributors: number
  contributorTrend: number
  daysSinceReceived: number | null
  daysSinceGiven: number | null
}

export interface CountAggregate {
  aggregate?: {
    count?: number | null
  } | null
}

export interface LatestFeedbackRow {
  feedbackDate?: string | null
  createdAt?: string | null
}

export interface FeedbackHubKpiResponse {
  receivedTotal?: CountAggregate | null
  receivedLast30?: CountAggregate | null
  receivedPrev30?: CountAggregate | null
  givenTotal?: CountAggregate | null
  givenLast30?: CountAggregate | null
  givenPrev30?: CountAggregate | null
  contributorsTotal?: CountAggregate | null
  contributorsLast30?: CountAggregate | null
  contributorsPrev30?: CountAggregate | null
  lastReceived?: LatestFeedbackRow[]
  lastGiven?: LatestFeedbackRow[]
}
