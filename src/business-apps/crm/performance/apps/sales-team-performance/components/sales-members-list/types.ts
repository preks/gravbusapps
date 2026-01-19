export interface SalesTeamMember {
  id: string
  name: string
  position: string
  totalRevenue: number // keeping field name for compatibility but displaying as "Total Sales"
  currencyId?: string
  activityScore: number // percentage value (0-100)
  avatar?: string | null
  pictureThumbnail?: string | null
  employeeId?: string
  manager?: {
    id: string
    name: string
    avatar?: string | null
  } | null
}

export interface SalesTeamPerformanceData {
  highestRevenue: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  lowestRevenue: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  highestActivity: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  lowestActivity: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  // Legacy property names for backward compatibility
  highestActivityScore?: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  lowestActivityScore?: {
    member: SalesTeamMember
    value: number
    trend?: 'up' | 'down'
  }
  teamMembers: SalesTeamMember[]
  timeFrame?: string
}

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface SalesMembersListProps extends BusinessAppContextProps {
  members?: SalesTeamMember[] // Optional - if not provided, will fetch own data
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  onMemberClick?: (member: SalesTeamMember) => void
  selectedMemberId?: string
}
