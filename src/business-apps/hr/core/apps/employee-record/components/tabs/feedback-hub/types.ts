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
