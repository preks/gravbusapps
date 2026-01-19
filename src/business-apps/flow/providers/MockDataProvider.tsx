import React, { createContext, useContext, ReactNode } from 'react'

// Mock entity data - matching backend exactly
export interface MockEntity {
  id: string
  name: string
}

export interface MockDataContextType {
  users: MockEntity[]
  departments: MockEntity[]
  roles: MockEntity[]
  capabilities: MockEntity[]
  companies: MockEntity[]
  locations: MockEntity[]
  costCenters: MockEntity[]
  matrixTeams: MockEntity[]
  resolveEntityName: (entity: string, id: string) => string
}

const mockUsers: MockEntity[] = [
  { id: 'user-001', name: 'Alice Johnson (HR Manager)' },
  { id: 'user-002', name: 'Bob Smith (Finance Manager)' },
  { id: 'user-007', name: 'Grace Lee (Senior Software Engineer)' },
  { id: 'user-008', name: 'Henry Taylor (Sales Manager)' },
  { id: 'user-009', name: 'Ivy Chen (Marketing Manager)' }
]

const mockDepartments: MockEntity[] = [
  { id: 'dept-001', name: 'Human Resources' },
  { id: 'dept-002', name: 'Finance' },
  { id: 'dept-003', name: 'Engineering' },
  { id: 'dept-004', name: 'Sales' },
  { id: 'dept-005', name: 'Marketing' }
]

const mockRoles: MockEntity[] = [
  { id: 'role-001', name: 'HR Manager' },
  { id: 'role-003', name: 'Finance Manager' },
  { id: 'role-005', name: 'Senior Software Engineer' },
  { id: 'role-007', name: 'Sales Manager' },
  { id: 'role-009', name: 'Marketing Manager' }
]

const mockCapabilities: MockEntity[] = [
  { id: 'cap-001', name: 'Employee Relations' },
  { id: 'cap-002', name: 'Recruitment' },
  { id: 'cap-003', name: 'Performance Management' },
  { id: 'cap-004', name: 'Training & Development' },
  { id: 'cap-005', name: 'Software Development' },
  { id: 'cap-006', name: 'Project Management' },
  { id: 'cap-007', name: 'Financial Analysis' },
  { id: 'cap-008', name: 'Budget Planning' },
  { id: 'cap-009', name: 'Sales Strategy' },
  { id: 'cap-010', name: 'Customer Relations' },
  { id: 'cap-011', name: 'Marketing Strategy' },
  { id: 'cap-012', name: 'Content Creation' },
  { id: 'cap-013', name: 'Data Analysis' },
  { id: 'cap-014', name: 'Quality Assurance' },
  { id: 'cap-015', name: 'System Administration' }
]

const mockCompanies: MockEntity[] = [
  { id: 'company-001', name: 'NEWWORK SE' },
  { id: 'company-002', name: 'XING GmbH & Co. KG' },
  { id: 'company-003', name: 'kununu GmbH' },
  { id: 'company-004', name: 'NEWWORK Spain S.L.' },
  { id: 'company-005', name: 'NEWWORK Italia S.r.l.' }
]

const mockLocations: MockEntity[] = [
  { id: 'location-001', name: 'Hamburg - HQ' },
  { id: 'location-002', name: 'Berlin - Office' },
  { id: 'location-003', name: 'Munich - Office' },
  { id: 'location-004', name: 'Vienna - Office' },
  { id: 'location-005', name: 'Barcelona - Office' },
  { id: 'location-006', name: 'Milan - Office' }
]

const mockCostCenters: MockEntity[] = [
  { id: 'cc-001', name: 'HR - Administration' },
  { id: 'cc-002', name: 'IT - Infrastructure' },
  { id: 'cc-003', name: 'Marketing - Digital' },
  { id: 'cc-004', name: 'Sales - Direct' },
  { id: 'cc-005', name: 'Finance - Operations' },
  { id: 'cc-006', name: 'Product - Development' }
]

const mockMatrixTeams: MockEntity[] = [
  { id: 'matrix-001', name: 'Digital Transformation' },
  { id: 'matrix-002', name: 'Customer Experience' },
  { id: 'matrix-003', name: 'Data Analytics' },
  { id: 'matrix-004', name: 'Security & Compliance' },
  { id: 'matrix-005', name: 'Innovation Lab' }
]

const MockDataContext = createContext<MockDataContextType | undefined>(undefined)

export const MockDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const resolveEntityName = (entity: string, id: string): string => {
    let entities: MockEntity[] = []

    switch (entity) {
      case 'users':
        entities = mockUsers
        break
      case 'departments':
        entities = mockDepartments
        break
      case 'roles':
        entities = mockRoles
        break
      case 'capabilities':
        entities = mockCapabilities
        break
      case 'companies':
        entities = mockCompanies
        break
      case 'locations':
        entities = mockLocations
        break
      case 'costCenters':
        entities = mockCostCenters
        break
      case 'matrixTeams':
        entities = mockMatrixTeams
        break
      default:
        return id // Return ID if entity type not found
    }

    const found = entities.find(e => e.id === id)
    return found ? found.name : id // Return name if found, otherwise return ID
  }

  const value: MockDataContextType = {
    users: mockUsers,
    departments: mockDepartments,
    roles: mockRoles,
    capabilities: mockCapabilities,
    companies: mockCompanies,
    locations: mockLocations,
    costCenters: mockCostCenters,
    matrixTeams: mockMatrixTeams,
    resolveEntityName
  }

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>
}

export const useMockData = (): MockDataContextType => {
  const context = useContext(MockDataContext)
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider')
  }
  return context
}
