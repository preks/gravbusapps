import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

export interface EmployeePopoverProps {
  /** Employee data object - if provided, use directly */
  employee?: EmployeeRef
  /** Employee ID - if provided, fetch employee data */
  employeeId?: string
  /** Access token - REQUIRED if employeeId is provided, also required for picture loading */
  accessToken?: string
  /** Children to trigger the popover */
  children: React.ReactNode
}
