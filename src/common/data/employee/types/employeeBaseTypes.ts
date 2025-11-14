export interface Employee {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  displayName?: string
  fullName?: string
  picture?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name?: string
    }
    organizationalUnit?: {
      name?: string
    }
  }
  communication?: Array<{
    purpose?: string
    channel?: {
      value?: string
      code?: string
    }
    value?: string
    type?: {
      value?: string
    }
  }>
}

// Backward compatibility alias
export type EmployeeRef = Employee
