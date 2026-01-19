import { BusinessAppContextProps } from '@/business-apps/types'

export type DashboardProps = BusinessAppContextProps

export interface AnalyticsKpiData {
  totalEmployees: {
    value: number
    change: number
    changeType: 'increase' | 'decrease'
    period: string
  }
  newHires: {
    value: number
    period: string
  }
  turnoverRate: {
    value: number
    change: number
    changeType: 'increase' | 'decrease'
    period: string
  }
  avgSalary: {
    value: number
    period: string
  }
}

export type TabKey =
  | 'overview'
  | 'demographics'
  | 'recruitment'
  | 'performance'
  | 'retention'
  | 'compensation'
  | 'training'
  | 'engagement'
