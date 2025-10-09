/**
 * Mock Users Data
 *
 * Centralized user data for Flow UI components.
 * Simplified structure with 6 users across 4 departments to demonstrate
 * assignment resolution functionality with clear department-based naming.
 * This data matches the mock users from the backend mockOrganizationalData.ts
 * and will be replaced with real user data integration in the future.
 */

export interface User {
  id: string
  name: string
  email: string
  department: string
  role: string
}

/**
 * Mock users - simplified organization matching backend exactly
 * Data sourced from custom-flow-engine/src/data/mockOrganizationalData.ts
 */
export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: 'Hanna Johnson',
    email: 'hanna.johnson@newwork.com',
    department: 'Human Resources',
    role: 'HR Manager'
  },
  {
    id: 'user-002',
    name: 'Henry Taylor',
    email: 'henry.taylor@newwork.com',
    department: 'Human Resources',
    role: 'HR Specialist'
  },
  {
    id: 'user-003',
    name: 'Ian Martinez',
    email: 'ian.martinez@newwork.com',
    department: 'IT Department',
    role: 'IT Manager'
  },
  {
    id: 'user-004',
    name: 'Emma Davis',
    email: 'emma.davis@newwork.com',
    department: 'Engineering',
    role: 'Engineering Manager'
  },
  {
    id: 'user-005',
    name: 'Sam Wilson',
    email: 'sam.wilson@newwork.com',
    department: 'Finance',
    role: 'Finance Manager'
  },
  {
    id: 'user-006',
    name: 'Ethan Rodriguez',
    email: 'ethan.rodriguez@newwork.com',
    department: 'Engineering',
    role: 'Engineering Director'
  }
]

/**
 * Get user by ID
 */
export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(user => user.id === userId)
}

/**
 * Get users by department
 */
export const getUsersByDepartment = (department: string): User[] => {
  return mockUsers.filter(user => user.department === department)
}

/**
 * Get all departments
 */
export const getAllDepartments = (): string[] => {
  return [...new Set(mockUsers.map(user => user.department))]
}

/**
 * Get all roles
 */
export const getAllRoles = (): string[] => {
  return [...new Set(mockUsers.map(user => user.role))]
}
