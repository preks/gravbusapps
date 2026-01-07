import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export type DashboardProps = BusinessAppContextProps

export interface AnalyticsKpiData {
  employeeCount: {
    value: number
    label: string
  }
  newHires: {
    value: number
    label: string
  }
  turnoverRate: {
    value: number
    change: number
    label: string
  }
  averageSalary: {
    value: number
    label: string
  }
}
