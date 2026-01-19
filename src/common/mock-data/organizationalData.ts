/**
 * Common mock data for organizational structure and user resolution
 * Used for testing assignment resolution in both frontend and backend
 */

export interface MockUser {
  id: string
  name: string
  email: string
  departmentId: string
  roleId: string
  capabilityIds: string[]
  legalEntityId: string
  locationId: string
  managerId?: string
  isActive: boolean
}

export interface MockDepartment {
  id: string
  name: string
  description: string
  managerId: string
  legalEntityId: string
  locationId: string
  parentDepartmentId?: string
}

export interface MockRole {
  id: string
  name: string
  description: string
  level: number
  departmentId?: string
}

export interface MockCapability {
  id: string
  name: string
  description: string
  category: string
}

export interface MockLegalEntity {
  id: string
  name: string
  code: string
  country: string
  currency: string
}

export interface MockLocation {
  id: string
  name: string
  address: string
  city: string
  country: string
  legalEntityId: string
}

export interface MockTeam {
  id: string
  name: string
  description: string
  leaderId: string
  departmentId: string
  memberIds: string[]
}

// Mock Legal Entities
export const mockLegalEntities: MockLegalEntity[] = [
  {
    id: 'le-001',
    name: 'NEWWORK SE',
    code: 'NWSE',
    country: 'Germany',
    currency: 'EUR'
  },
  {
    id: 'le-002',
    name: 'NEWWORK Inc.',
    code: 'NWINC',
    country: 'United States',
    currency: 'USD'
  },
  {
    id: 'le-003',
    name: 'NEWWORK Ltd.',
    code: 'NWLTD',
    country: 'United Kingdom',
    currency: 'GBP'
  }
]

// Mock Locations
export const mockLocations: MockLocation[] = [
  {
    id: 'loc-001',
    name: 'Hamburg Office',
    address: 'Am Strandkai 1',
    city: 'Hamburg',
    country: 'Germany',
    legalEntityId: 'le-001'
  },
  {
    id: 'loc-002',
    name: 'Berlin Office',
    address: 'Unter den Linden 1',
    city: 'Berlin',
    country: 'Germany',
    legalEntityId: 'le-001'
  },
  {
    id: 'loc-003',
    name: 'New York Office',
    address: '123 Broadway',
    city: 'New York',
    country: 'United States',
    legalEntityId: 'le-002'
  },
  {
    id: 'loc-004',
    name: 'London Office',
    address: '456 Oxford Street',
    city: 'London',
    country: 'United Kingdom',
    legalEntityId: 'le-003'
  }
]

// Mock Departments
export const mockDepartments: MockDepartment[] = [
  {
    id: 'dept-001',
    name: 'Engineering',
    description: 'Software development and technical operations',
    managerId: 'user-001',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-002',
    name: 'Product Management',
    description: 'Product strategy and roadmap',
    managerId: 'user-002',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-003',
    name: 'Human Resources',
    description: 'People operations and talent management',
    managerId: 'user-003',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-004',
    name: 'Finance',
    description: 'Financial planning and operations',
    managerId: 'user-004',
    legalEntityId: 'le-001',
    locationId: 'loc-001'
  },
  {
    id: 'dept-005',
    name: 'Marketing',
    description: 'Brand and growth marketing',
    managerId: 'user-005',
    legalEntityId: 'le-001',
    locationId: 'loc-002'
  },
  {
    id: 'dept-006',
    name: 'Sales',
    description: 'Revenue generation and customer acquisition',
    managerId: 'user-006',
    legalEntityId: 'le-002',
    locationId: 'loc-003'
  }
]

// Mock Roles
export const mockRoles: MockRole[] = [
  {
    id: 'role-001',
    name: 'Software Engineer',
    description: 'Develops and maintains software applications',
    level: 3,
    departmentId: 'dept-001'
  },
  {
    id: 'role-002',
    name: 'Senior Software Engineer',
    description: 'Senior-level software development and mentoring',
    level: 4,
    departmentId: 'dept-001'
  },
  {
    id: 'role-003',
    name: 'Engineering Manager',
    description: 'Manages engineering teams and projects',
    level: 5,
    departmentId: 'dept-001'
  },
  {
    id: 'role-004',
    name: 'Product Manager',
    description: 'Manages product strategy and roadmap',
    level: 4,
    departmentId: 'dept-002'
  },
  {
    id: 'role-005',
    name: 'Senior Product Manager',
    description: 'Senior product strategy and cross-team coordination',
    level: 5,
    departmentId: 'dept-002'
  },
  {
    id: 'role-006',
    name: 'HR Business Partner',
    description: 'Strategic HR support for business units',
    level: 4,
    departmentId: 'dept-003'
  },
  {
    id: 'role-007',
    name: 'Financial Analyst',
    description: 'Financial analysis and reporting',
    level: 3,
    departmentId: 'dept-004'
  },
  {
    id: 'role-008',
    name: 'Marketing Manager',
    description: 'Marketing campaign management and strategy',
    level: 4,
    departmentId: 'dept-005'
  },
  {
    id: 'role-009',
    name: 'Sales Representative',
    description: 'Customer acquisition and relationship management',
    level: 3,
    departmentId: 'dept-006'
  },
  {
    id: 'role-010',
    name: 'Director',
    description: 'Senior leadership and strategic direction',
    level: 6
  }
]

// Mock Capabilities
export const mockCapabilities: MockCapability[] = [
  {
    id: 'cap-001',
    name: 'JavaScript Development',
    description: 'Proficiency in JavaScript programming',
    category: 'Technical'
  },
  {
    id: 'cap-002',
    name: 'React Development',
    description: 'Experience with React framework',
    category: 'Technical'
  },
  {
    id: 'cap-003',
    name: 'Node.js Development',
    description: 'Backend development with Node.js',
    category: 'Technical'
  },
  {
    id: 'cap-004',
    name: 'Database Design',
    description: 'Database architecture and optimization',
    category: 'Technical'
  },
  {
    id: 'cap-005',
    name: 'Product Strategy',
    description: 'Strategic product planning and roadmapping',
    category: 'Business'
  },
  {
    id: 'cap-006',
    name: 'User Research',
    description: 'User experience research and analysis',
    category: 'Business'
  },
  {
    id: 'cap-007',
    name: 'Financial Analysis',
    description: 'Financial modeling and analysis',
    category: 'Business'
  },
  {
    id: 'cap-008',
    name: 'Team Leadership',
    description: 'Leading and managing teams',
    category: 'Leadership'
  },
  {
    id: 'cap-009',
    name: 'Project Management',
    description: 'Managing complex projects and timelines',
    category: 'Leadership'
  },
  {
    id: 'cap-010',
    name: 'Digital Marketing',
    description: 'Online marketing and growth strategies',
    category: 'Marketing'
  }
]

// Mock Users
export const mockUsers: MockUser[] = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@newwork.com',
    departmentId: 'dept-001',
    roleId: 'role-003',
    capabilityIds: ['cap-001', 'cap-002', 'cap-008', 'cap-009'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob.smith@newwork.com',
    departmentId: 'dept-002',
    roleId: 'role-005',
    capabilityIds: ['cap-005', 'cap-006', 'cap-008'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    managerId: 'user-001',
    isActive: true
  },
  {
    id: 'user-003',
    name: 'Carol Davis',
    email: 'carol.davis@newwork.com',
    departmentId: 'dept-003',
    roleId: 'role-006',
    capabilityIds: ['cap-008', 'cap-009'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-004',
    name: 'David Wilson',
    email: 'david.wilson@newwork.com',
    departmentId: 'dept-004',
    roleId: 'role-007',
    capabilityIds: ['cap-007'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    isActive: true
  },
  {
    id: 'user-005',
    name: 'Eve Brown',
    email: 'eve.brown@newwork.com',
    departmentId: 'dept-005',
    roleId: 'role-008',
    capabilityIds: ['cap-010', 'cap-008'],
    legalEntityId: 'le-001',
    locationId: 'loc-002',
    isActive: true
  },
  {
    id: 'user-006',
    name: 'Frank Miller',
    email: 'frank.miller@newwork.com',
    departmentId: 'dept-006',
    roleId: 'role-009',
    capabilityIds: ['cap-008'],
    legalEntityId: 'le-002',
    locationId: 'loc-003',
    isActive: true
  },
  {
    id: 'user-007',
    name: 'Grace Lee',
    email: 'grace.lee@newwork.com',
    departmentId: 'dept-001',
    roleId: 'role-002',
    capabilityIds: ['cap-001', 'cap-002', 'cap-003'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    managerId: 'user-001',
    isActive: true
  },
  {
    id: 'user-008',
    name: 'Henry Taylor',
    email: 'henry.taylor@newwork.com',
    departmentId: 'dept-001',
    roleId: 'role-001',
    capabilityIds: ['cap-001', 'cap-002'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    managerId: 'user-001',
    isActive: true
  },
  {
    id: 'user-009',
    name: 'Ivy Chen',
    email: 'ivy.chen@newwork.com',
    departmentId: 'dept-001',
    roleId: 'role-001',
    capabilityIds: ['cap-001', 'cap-003', 'cap-004'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    managerId: 'user-001',
    isActive: true
  },
  {
    id: 'user-010',
    name: 'Jack Anderson',
    email: 'jack.anderson@newwork.com',
    departmentId: 'dept-002',
    roleId: 'role-004',
    capabilityIds: ['cap-005', 'cap-006'],
    legalEntityId: 'le-001',
    locationId: 'loc-001',
    managerId: 'user-002',
    isActive: true
  }
]

// Mock Teams
export const mockTeams: MockTeam[] = [
  {
    id: 'team-001',
    name: 'Frontend Team',
    description: 'Frontend development team',
    leaderId: 'user-007',
    departmentId: 'dept-001',
    memberIds: ['user-007', 'user-008']
  },
  {
    id: 'team-002',
    name: 'Backend Team',
    description: 'Backend development team',
    leaderId: 'user-009',
    departmentId: 'dept-001',
    memberIds: ['user-009']
  },
  {
    id: 'team-003',
    name: 'Product Team',
    description: 'Product management team',
    leaderId: 'user-002',
    departmentId: 'dept-002',
    memberIds: ['user-002', 'user-010']
  }
]

/**
 * Assignment Resolution Functions
 */

export function resolveUsersByDepartment(departmentId: string): MockUser[] {
  return mockUsers.filter(user => user.departmentId === departmentId && user.isActive)
}

export function resolveUsersByRole(roleId: string): MockUser[] {
  return mockUsers.filter(user => user.roleId === roleId && user.isActive)
}

export function resolveUsersByCapability(capabilityId: string): MockUser[] {
  return mockUsers.filter(user => user.capabilityIds.includes(capabilityId) && user.isActive)
}

export function resolveUsersByTeam(teamId: string): MockUser[] {
  const team = mockTeams.find(t => t.id === teamId)
  if (!team) return []
  return mockUsers.filter(user => team.memberIds.includes(user.id) && user.isActive)
}

export function resolveUsersByLegalEntity(legalEntityId: string): MockUser[] {
  return mockUsers.filter(user => user.legalEntityId === legalEntityId && user.isActive)
}

export function resolveUsersByLocation(locationId: string): MockUser[] {
  return mockUsers.filter(user => user.locationId === locationId && user.isActive)
}

export function resolveAssignmentTargets(targets: Array<{ entity: string; id: string }>): MockUser[] {
  const resolvedUsers: MockUser[] = []

  targets.forEach(target => {
    let users: MockUser[] = []

    switch (target.entity) {
      case 'user':
        const user = mockUsers.find(u => u.id === target.id && u.isActive)
        if (user) users = [user]
        break
      case 'department':
        users = resolveUsersByDepartment(target.id)
        break
      case 'role':
        users = resolveUsersByRole(target.id)
        break
      case 'capability':
        users = resolveUsersByCapability(target.id)
        break
      case 'team':
        users = resolveUsersByTeam(target.id)
        break
      case 'legal_entity':
        users = resolveUsersByLegalEntity(target.id)
        break
      case 'location':
        users = resolveUsersByLocation(target.id)
        break
    }

    // Add users avoiding duplicates
    users.forEach(user => {
      if (!resolvedUsers.find(u => u.id === user.id)) {
        resolvedUsers.push(user)
      }
    })
  })

  return resolvedUsers
}

/**
 * Utility Functions
 */

export function getUserById(userId: string): MockUser | undefined {
  return mockUsers.find(user => user.id === userId)
}

export function getDepartmentById(departmentId: string): MockDepartment | undefined {
  return mockDepartments.find(dept => dept.id === departmentId)
}

export function getRoleById(roleId: string): MockRole | undefined {
  return mockRoles.find(role => role.id === roleId)
}

export function getCapabilityById(capabilityId: string): MockCapability | undefined {
  return mockCapabilities.find(cap => cap.id === capabilityId)
}

export function getTeamById(teamId: string): MockTeam | undefined {
  return mockTeams.find(team => team.id === teamId)
}

export function getLegalEntityById(legalEntityId: string): MockLegalEntity | undefined {
  return mockLegalEntities.find(le => le.id === legalEntityId)
}

export function getLocationById(locationId: string): MockLocation | undefined {
  return mockLocations.find(loc => loc.id === locationId)
}
