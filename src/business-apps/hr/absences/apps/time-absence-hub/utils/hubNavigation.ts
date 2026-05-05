import { Navigation, navigateTo } from '@/common/utils/navigationUtils'

const EMPLOYEE_RECORD_PATH = Navigation.HR_EMPLOYEE_RECORD

export const openEmployeeTimeTracking = (employeeId: string): void => {
  if (!employeeId) {
    return
  }
  const url = `${EMPLOYEE_RECORD_PATH}?tab=timeTracking&employeeId=${encodeURIComponent(employeeId)}`
  navigateTo(url)
}

export const openEmployeeRecord = (employeeId: string, tab?: string): void => {
  if (!employeeId) {
    return
  }
  const params = new URLSearchParams()
  if (tab) {
    params.set('tab', tab)
  }
  params.set('employeeId', employeeId)
  navigateTo(`${EMPLOYEE_RECORD_PATH}?${params.toString()}`)
}
