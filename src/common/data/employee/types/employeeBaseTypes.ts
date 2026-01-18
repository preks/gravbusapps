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
  hrReferenceCode?: string
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
  userId?: string
}

// Backward compatibility alias
export type EmployeeRef = Employee
