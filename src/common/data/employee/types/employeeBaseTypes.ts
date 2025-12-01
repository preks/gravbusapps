export interface EmployeePosition {
  jobPosition?: {
    name?: string
  }
  organizationalUnit?: {
    id?: string
    name?: string
  }
}

export interface Employee {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  displayName?: string
  fullName?: string
  picture?: string
  pictureThumbnail?: string
  userId?: string
  employeePosition?: EmployeePosition
}

// Backward compatibility alias
export type EmployeeRef = Employee
