// Shared types for employment data will be added here
// e.g., common interfaces, enums, type utilities

export const CONTRACT_TYPE_CATALOG = 'ContractType'
export const CONTRACT_TYPE_VERSION = 'v1'

export const EMPLOYMENT_TYPE_CATALOG = 'EmploymentType'
export const EMPLOYMENT_TYPE_VERSION = 'v1'

// Employee interfaces
export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId: string
  department?: string
  position?: string
  startDate?: string
  endDate?: string
  isActive: boolean
}

// Employment Type interfaces
export interface EmploymentType {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
}

// Contract Type interfaces
export interface ContractType {
  id: string
  name: string
  code: string
  description?: string
  duration?: string
  isActive: boolean
}

// Department interfaces
export interface Department {
  id: string
  name: string
  code: string
  description?: string
  parentDepartmentId?: string
  managerId?: string
  isActive: boolean
}

// Position interfaces
export interface Position {
  id: string
  title: string
  code: string
  description?: string
  departmentId?: string
  jobLevelId?: string
  isActive: boolean
}

// Employment Status interfaces
export interface EmploymentStatus {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
}

export {}
