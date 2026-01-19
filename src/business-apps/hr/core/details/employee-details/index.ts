import EmployeeDetails from './EmployeeDetails'

// Re-export as named exports
export { EmployeeDetails }

// Default export for wrapper compatibility
export default {
  EmployeeDetails
}

export type { EmployeeDetailsProps } from './EmployeeDetails'
export * from './types'
