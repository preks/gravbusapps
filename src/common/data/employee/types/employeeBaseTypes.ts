export interface Employee {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  displayName?: string
  fullName?: string
  picture?: string
  pictureThumbnail?: string
}

// Backward compatibility alias
export type EmployeeRef = Employee
