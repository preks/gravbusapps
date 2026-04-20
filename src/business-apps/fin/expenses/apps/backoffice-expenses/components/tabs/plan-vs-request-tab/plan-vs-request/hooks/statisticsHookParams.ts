import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PeriodHookBaseParams extends BusinessAppContextProps {
  period: 'month' | 'quarter' | 'year'
  currencyRef?: string
  selectedDepartment?: string
}

export interface PeriodStatisticsHookParams extends PeriodHookBaseParams {
  isActive?: boolean
}

export interface CategoryStatisticsGraphQLHookParams extends PeriodHookBaseParams {
  requestTypes: string[]
  isActive?: boolean
}
