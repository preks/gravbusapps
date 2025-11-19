export interface EnhancedAbsence {
  id: string
  status: string
  startDate: string
  endDate: string
  effectiveDays?: number
  calendarDays?: number
  workingDays?: number
  workingHours?: number
  type: {
    value: string
    parentEntryId?: string
    id: string
    objectValue?: any
    translations?: {
      localeCode: string
      value: string
    }[]
  }
  employee: {
    id: string
    firstName: string
    lastName: string
  }
  employeeName: string
  groupName: string
  originalGroupName: string
  typeName: string
  color?: string
  description?: string
  createdAt?: string
}
