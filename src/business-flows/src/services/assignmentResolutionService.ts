/**
 * Assignment Resolution Service
 * 
 * This service resolves assignment targets (departments, roles, teams, etc.) 
 * to actual user IDs that can be assigned tasks in workflows.
 * 
 * In production, this would integrate with actual HR/Identity systems.
 * For testing, it uses mock organizational data.
 */

import { logger } from '../utils/logger';

// Mock organizational data for testing
// In production, this would come from actual HR/Identity services

interface MockUser {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  roleId: string;
  capabilityIds: string[];
  legalEntityId: string;
  locationId: string;
  managerId?: string;
  isActive: boolean;
}

interface MockDepartment {
  id: string;
  name: string;
  description: string;
  managerId: string;
  legalEntityId: string;
  locationId: string;
  parentDepartmentId?: string;
}

interface MockRole {
  id: string;
  name: string;
  description: string;
  level: number;
  departmentId?: string;
}

interface MockTeam {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  departmentId: string;
  memberIds: string[];
}

interface MockCapability {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Mock data - Cross-functional organization for testing various business processes
const mockUsers: MockUser[] = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@newwork.com',
    departmentId: 'dept-001',
    roleId: 'role-001',
    capabilityIds: ['cap-001', 'cap-002', 'cap-011'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob.smith@newwork.com',
    departmentId: 'dept-002',
    roleId: 'role-003',
    capabilityIds: ['cap-003', 'cap-004', 'cap-012'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-007',
    name: 'Grace Lee',
    email: 'grace.lee@newwork.com',
    departmentId: 'dept-003',
    roleId: 'role-005',
    capabilityIds: ['cap-005', 'cap-006', 'cap-013'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-008',
    name: 'Henry Taylor',
    email: 'henry.taylor@newwork.com',
    departmentId: 'dept-004',
    roleId: 'role-007',
    capabilityIds: ['cap-007', 'cap-008', 'cap-014'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-009',
    name: 'Ivy Chen',
    email: 'ivy.chen@newwork.com',
    departmentId: 'dept-005',
    roleId: 'role-009',
    capabilityIds: ['cap-009', 'cap-010', 'cap-015'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  }
];

const mockDepartments: MockDepartment[] = [
  {
    id: 'dept-001',
    name: 'Human Resources',
    description: 'Employee relations, recruitment, and HR processes',
    managerId: 'user-001',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-002',
    name: 'Finance',
    description: 'Financial planning, accounting, and expense management',
    managerId: 'user-002',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-003',
    name: 'Engineering',
    description: 'Software development and technical operations',
    managerId: 'user-007',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-004',
    name: 'Sales',
    description: 'Sales operations and customer acquisition',
    managerId: 'user-008',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-005',
    name: 'Marketing',
    description: 'Marketing campaigns and brand management',
    managerId: 'user-009',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  }
];

const mockRoles: MockRole[] = [
  {
    id: 'role-001',
    name: 'HR Manager',
    description: 'Manages human resources processes and employee relations',
    level: 5,
    departmentId: 'dept-001'
  },
  {
    id: 'role-003',
    name: 'Finance Manager',
    description: 'Manages financial processes and expense approvals',
    level: 5,
    departmentId: 'dept-002'
  },
  {
    id: 'role-005',
    name: 'Senior Software Engineer',
    description: 'Senior-level software development and technical leadership',
    level: 4,
    departmentId: 'dept-003'
  },
  {
    id: 'role-007',
    name: 'Sales Manager',
    description: 'Manages sales processes and customer relationships',
    level: 5,
    departmentId: 'dept-004'
  },
  {
    id: 'role-009',
    name: 'Marketing Manager',
    description: 'Manages marketing campaigns and brand strategy',
    level: 5,
    departmentId: 'dept-005'
  }
];

const mockTeams: MockTeam[] = [
  {
    id: 'team-001',
    name: 'HR Operations',
    description: 'HR operations and employee services team',
    leaderId: 'user-001',
    departmentId: 'dept-001',
    memberIds: ['user-001']
  },
  {
    id: 'team-002',
    name: 'Finance Operations',
    description: 'Finance operations and accounting team',
    leaderId: 'user-002',
    departmentId: 'dept-002',
    memberIds: ['user-002']
  },
  {
    id: 'team-003',
    name: 'Engineering Team',
    description: 'Software development team',
    leaderId: 'user-007',
    departmentId: 'dept-003',
    memberIds: ['user-007']
  },
  {
    id: 'team-004',
    name: 'Sales Team',
    description: 'Sales operations team',
    leaderId: 'user-008',
    departmentId: 'dept-004',
    memberIds: ['user-008']
  },
  {
    id: 'team-005',
    name: 'Marketing Team',
    description: 'Marketing and brand team',
    leaderId: 'user-009',
    departmentId: 'dept-005',
    memberIds: ['user-009']
  }
];

const mockCapabilities: MockCapability[] = [
  {
    id: 'cap-001',
    name: 'Employee Relations',
    description: 'Managing employee relations and HR processes',
    category: 'HR'
  },
  {
    id: 'cap-002',
    name: 'Recruitment',
    description: 'Talent acquisition and recruitment processes',
    category: 'HR'
  },
  {
    id: 'cap-003',
    name: 'Financial Analysis',
    description: 'Financial planning and analysis capabilities',
    category: 'Finance'
  },
  {
    id: 'cap-004',
    name: 'Budget Management',
    description: 'Budget planning and expense management',
    category: 'Finance'
  },
  {
    id: 'cap-005',
    name: 'Software Development',
    description: 'Programming and software development skills',
    category: 'Technical'
  },
  {
    id: 'cap-006',
    name: 'System Architecture',
    description: 'System design and architecture expertise',
    category: 'Technical'
  },
  {
    id: 'cap-007',
    name: 'Sales Strategy',
    description: 'Sales planning and customer relationship management',
    category: 'Sales'
  },
  {
    id: 'cap-008',
    name: 'Contract Negotiation',
    description: 'Contract negotiation and deal closing',
    category: 'Sales'
  },
  {
    id: 'cap-009',
    name: 'Digital Marketing',
    description: 'Digital marketing and campaign management',
    category: 'Marketing'
  },
  {
    id: 'cap-010',
    name: 'Brand Management',
    description: 'Brand strategy and management',
    category: 'Marketing'
  },
  {
    id: 'cap-011',
    name: 'Compliance Management',
    description: 'Regulatory compliance and policy management',
    category: 'Compliance'
  },
  {
    id: 'cap-012',
    name: 'Risk Assessment',
    description: 'Financial risk assessment and management',
    category: 'Risk Management'
  },
  {
    id: 'cap-013',
    name: 'Project Management',
    description: 'Project planning and execution management',
    category: 'Management'
  },
  {
    id: 'cap-014',
    name: 'Customer Relations',
    description: 'Customer service and relationship management',
    category: 'Customer Service'
  },
  {
    id: 'cap-015',
    name: 'Content Creation',
    description: 'Content creation and marketing materials',
    category: 'Creative'
  }
];

/**
 * Assignment target interface
 */
export interface AssignmentTarget {
  entity: 'user' | 'department' | 'role' | 'capability' | 'legal_entity' | 'location';
  id: string;
}

/**
 * Resolved user interface
 */
export interface ResolvedUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): MockUser | undefined {
  return mockUsers.find(user => user.id === userId);
}

/**
 * Resolve users by department
 */
export function resolveUsersByDepartment(departmentId: string): MockUser[] {
  return mockUsers.filter(user => user.departmentId === departmentId && user.isActive);
}

/**
 * Resolve users by role
 */
export function resolveUsersByRole(roleId: string): MockUser[] {
  return mockUsers.filter(user => user.roleId === roleId && user.isActive);
}

/**
 * Resolve users by capability
 */
export function resolveUsersByCapability(capabilityId: string): MockUser[] {
  return mockUsers.filter(user => user.capabilityIds.includes(capabilityId) && user.isActive);
}

/**
 * Resolve users by team
 */
export function resolveUsersByTeam(teamId: string): MockUser[] {
  const team = mockTeams.find(t => t.id === teamId);
  if (!team) return [];
  return mockUsers.filter(user => team.memberIds.includes(user.id) && user.isActive);
}

/**
 * Resolve users by legal entity
 */
export function resolveUsersByLegalEntity(legalEntityId: string): MockUser[] {
  return mockUsers.filter(user => user.legalEntityId === legalEntityId && user.isActive);
}

/**
 * Resolve users by location
 */
export function resolveUsersByLocation(locationId: string): MockUser[] {
  return mockUsers.filter(user => user.locationId === locationId && user.isActive);
}

/**
 * Main function to resolve assignment targets to actual users
 */
export function resolveAssignmentTargets(targets: AssignmentTarget[]): ResolvedUser[] {
  const resolvedUsers: ResolvedUser[] = [];
  const userIds = new Set<string>(); // To avoid duplicates
  
  targets.forEach(target => {
    let users: MockUser[] = [];
    
    switch (target.entity) {
      case 'user':
        const user = mockUsers.find(u => u.id === target.id && u.isActive);
        if (user) users = [user];
        break;
      case 'department':
        users = resolveUsersByDepartment(target.id);
        break;
      case 'role':
        users = resolveUsersByRole(target.id);
        break;
      case 'capability':
        users = resolveUsersByCapability(target.id);
        break;
      case 'legal_entity':
        users = resolveUsersByLegalEntity(target.id);
        break;
      case 'location':
        users = resolveUsersByLocation(target.id);
        break;
      default:
        logger.warn(`Unknown assignment target entity: ${target.entity}`);
    }
    
    // Add users avoiding duplicates
    users.forEach(user => {
      if (!userIds.has(user.id)) {
        userIds.add(user.id);
        resolvedUsers.push({
          id: user.id,
          name: user.name,
          email: user.email
        });
      }
    });
  });
  
  logger.info(`Resolved ${targets.length} assignment targets to ${resolvedUsers.length} users`);
  return resolvedUsers;
}

/**
 * Check if a user matches assignment criteria
 */
export function userMatchesAssignmentTargets(userId: string, targets: AssignmentTarget[]): boolean {
  const resolvedUsers = resolveAssignmentTargets(targets);
  return resolvedUsers.some(user => user.id === userId);
}

/**
 * Get all mock users (for testing/debugging)
 */
export function getAllUsers(): ResolvedUser[] {
  return mockUsers
    .filter(user => user.isActive)
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email
    }));
}

/**
 * Get organizational structure information
 */
export function getOrganizationalInfo() {
  return {
    departments: mockDepartments,
    roles: mockRoles,
    teams: mockTeams,
    capabilities: mockCapabilities,
    userCount: mockUsers.filter(u => u.isActive).length
  };
} 