import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Entity types that activities can reference
export type ActivityEntityType = 'Contact' | 'Lead' | 'Opportunity' | 'Account'

// Activity types for activities
export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Task'

// Basic employee info for activity ownership
export interface ActivityEmployee {
  id: string
  firstName: string
  lastName: string
  displayName: string
}

// Reference to the entity the activity is related to
export interface ActivityReference {
  entityType: ActivityEntityType
  entityId: string
  entityName: string
}

// Main sales activity interface
export interface SalesActivity {
  id: string
  title: string
  type: string
  activityType?: { value: string } // Add this line
  reference: ActivityReference
  occurredAt: string
  createdAt: string
  activityScore: number // 0-100 percentage
  description?: string
  ownerEmployee: ActivityEmployee
  source?: string // Add this line
}

// Activity statistics data structure
export interface ActivityStatistics {
  totalActivities: {
    count: number
    period: string // e.g., "This month"
  }
  mostCommonActivity: {
    type: ActivityType
    count: number
    percentage: number
  }
  mostWorkedEntity: {
    entityType: ActivityEntityType
    count: number
    percentage: number
  }
  averageActivityScore: {
    score: number // 0-100
    trend: number // percentage change
  }
}

// Props for activities statistics component
export interface ActivitiesStatisticsProps extends BusinessAppContextProps {
  employeeId: string
  onRetry?: () => void
}

// Props for activities table component
export interface ActivitiesTableProps {
  employeeId: string
  accessToken: string
  userInfo?: any
  onTotalChange?: (total: number) => void
}

// Props for main sales activities tab
export interface SalesActivitiesTabProps extends BusinessAppContextProps {
  memberId: string
}
