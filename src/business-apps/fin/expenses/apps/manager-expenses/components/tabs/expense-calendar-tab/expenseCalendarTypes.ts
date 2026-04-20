export interface TeamEmployee {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName?: string
  displayName?: string
  department?: string
  jobTitle?: string
  employeePosition?: {
    organizationalUnit?: {
      name: string
    }
  }
}

export interface ExpenseTimelineItem {
  id: string
  name: string
  detail?: string
}

export interface ExpenseTimelineEvent {
  id: string
  itemId: string
  startDate: string
  endDate: string
  type: string
  color?: string
  note: string
  status: string
  title: string
  eventType: 'Plan' | 'Request'
}
