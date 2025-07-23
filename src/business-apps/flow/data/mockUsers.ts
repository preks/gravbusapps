/**
 * Mock Users Data
 * 
 * Centralized user data for Flow UI components.
 * This data matches the mock users from the backend assignmentResolutionService.ts
 * and will be replaced with real user data integration in the future.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

/**
 * Mock users - cross-functional organization matching backend exactly
 * Data sourced from custom-flow-engine/src/services/assignment/assignmentResolutionService.ts
 */
export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@newwork.com',
    department: 'Human Resources',
    role: 'HR Manager'
  },
  {
    id: 'user-007',
    name: 'David Wilson',
    email: 'david.wilson@newwork.com',
    department: 'IT',
    role: 'IT Manager'
  },
  {
    id: 'emp-001',
    name: 'John NewHire',
    email: 'john.newhire@newwork.com',
    department: 'Engineering',
    role: 'Senior Software Engineer'
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob.smith@newwork.com',
    department: 'Finance',
    role: 'Finance Manager'
  },
  {
    id: 'user-003',
    name: 'Grace Lee',
    email: 'grace.lee@newwork.com',
    department: 'Engineering',
    role: 'Senior Software Engineer'
  },
  {
    id: 'user-004',
    name: 'Henry Taylor',
    email: 'henry.taylor@newwork.com',
    department: 'Sales',
    role: 'Sales Manager'
  },
  {
    id: 'user-005',
    name: 'Ivy Chen',
    email: 'ivy.chen@newwork.com',
    department: 'Marketing',
    role: 'Marketing Manager'
  },
  {
    id: 'user-008',
    name: 'Emma Davis',
    email: 'emma.davis@newwork.com',
    department: 'Sales',
    role: 'Sales Director'
  },
  {
    id: 'user-009',
    name: 'Frank Martinez',
    email: 'frank.martinez@newwork.com',
    department: 'Marketing',
    role: 'Marketing Director'
  }
];

/**
 * Get user by ID
 */
export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(user => user.id === userId);
};

/**
 * Get users by department
 */
export const getUsersByDepartment = (department: string): User[] => {
  return mockUsers.filter(user => user.department === department);
};

/**
 * Get all departments
 */
export const getAllDepartments = (): string[] => {
  return [...new Set(mockUsers.map(user => user.department))];
};

/**
 * Get all roles
 */
export const getAllRoles = (): string[] => {
  return [...new Set(mockUsers.map(user => user.role))];
}; 