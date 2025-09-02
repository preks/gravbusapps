import { useState, useCallback } from 'react';
import { GuardianViewMode, GuardianFilter } from '../types/guardianTypes';

interface OrganizationalDataParams {
  viewMode: GuardianViewMode;
  filters: GuardianFilter;
}

interface OrganizationalDataResult {
  users: any[];
  departments: any[];
  companies: any[];
  locations: any[];
  capabilities: any[];
  relationships: any[];
  metadata: {
    totalUsers: number;
    activeDepartments: number;
    lastUpdated: string;
  };
}

export const useGuardianOrganizationalData = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrganizationalData = useCallback(async (params: OrganizationalDataParams): Promise<OrganizationalDataResult> => {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement actual API calls to your organizational data service
      // For now, return mock data structure based on your existing mockOrganizationalData
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockData: OrganizationalDataResult = {
        users: [
          {
            id: 'user-001',
            name: 'Alice Johnson',
            email: 'alice.johnson@newwork.com',
            organizationalUnits: ['dept-001'], // HR
            matrixTeams: ['matrix-001'],
            companies: ['le-001'],
            siteLocations: ['loc-001'],
            costCenters: ['cc-001'],
            capabilities: ['cap-001', 'cap-002'], // HR Management + Employee Relations
            roleId: 'role-001',
            managerId: undefined,
            isActive: true,
            activeTaskCount: 3,
            completedTaskCount: 15
          },
          {
            id: 'user-002',
            name: 'Bob Smith',
            email: 'bob.smith@newwork.com',
            organizationalUnits: ['dept-001'], // HR
            matrixTeams: ['matrix-001'],
            companies: ['le-001'],
            siteLocations: ['loc-001'],
            costCenters: ['cc-001'],
            capabilities: ['cap-001', 'cap-009'], // HR Management + Recruiting
            roleId: 'role-002',
            managerId: 'user-001',
            isActive: true,
            activeTaskCount: 2,
            completedTaskCount: 8
          },
          {
            id: 'user-003',
            name: 'Charlie Davis',
            email: 'charlie.davis@newwork.com',
            organizationalUnits: ['dept-002'], // IT
            matrixTeams: ['matrix-002'],
            companies: ['le-001'],
            siteLocations: ['loc-001'],
            costCenters: ['cc-002'],
            capabilities: ['cap-003', 'cap-005'], // Software Engineering + System Administration
            roleId: 'role-003',
            managerId: 'user-004',
            isActive: true,
            activeTaskCount: 5,
            completedTaskCount: 22
          },
          {
            id: 'user-004',
            name: 'Diana Wilson',
            email: 'diana.wilson@newwork.com',
            organizationalUnits: ['dept-002'], // IT
            matrixTeams: ['matrix-002'],
            companies: ['le-001'],
            siteLocations: ['loc-001'],
            costCenters: ['cc-002'],
            capabilities: ['cap-003', 'cap-005', 'cap-006'], // Software Engineering + System Administration + Project Management
            roleId: 'role-004',
            managerId: 'user-006',
            isActive: true,
            activeTaskCount: 1,
            completedTaskCount: 18
          }
        ],
        departments: [
          {
            id: 'dept-001',
            name: 'Human Resources',
            description: 'Manages employee relations, recruitment, and organizational development',
            managerId: 'user-001',
            legalEntityId: 'le-001',
            locationId: 'loc-001',
            activeWorkflows: 3,
            activeTaskCount: 5,
            completionRate: 0.85
          },
          {
            id: 'dept-002',
            name: 'IT Department',
            description: 'Information technology services, systems administration, and technical support',
            managerId: 'user-004',
            legalEntityId: 'le-001',
            locationId: 'loc-001',
            activeWorkflows: 2,
            activeTaskCount: 6,
            completionRate: 0.92
          },
          {
            id: 'dept-003',
            name: 'Engineering',
            description: 'Software development and technical infrastructure',
            managerId: 'user-006',
            legalEntityId: 'le-001',
            locationId: 'loc-001',
            activeWorkflows: 4,
            activeTaskCount: 8,
            completionRate: 0.88
          },
          {
            id: 'dept-004',
            name: 'Finance',
            description: 'Financial planning, analysis, and reporting',
            managerId: 'user-005',
            legalEntityId: 'le-001',
            locationId: 'loc-001',
            activeWorkflows: 1,
            activeTaskCount: 2,
            completionRate: 0.95
          }
        ],
        companies: [
          {
            id: 'le-001',
            name: 'NEWWORK SE',
            description: 'Primary legal entity',
            location: 'Hamburg, Germany'
          }
        ],
        locations: [
          {
            id: 'loc-001',
            name: 'Hamburg HQ',
            description: 'Main headquarters',
            country: 'Germany',
            city: 'Hamburg'
          }
        ],
        capabilities: [
          { id: 'cap-001', name: 'HR Management', category: 'Human Resources' },
          { id: 'cap-002', name: 'Employee Relations', category: 'Human Resources' },
          { id: 'cap-003', name: 'Software Engineering', category: 'Technology' },
          { id: 'cap-004', name: 'Data Analysis', category: 'Technology' },
          { id: 'cap-005', name: 'System Administration', category: 'Technology' },
          { id: 'cap-006', name: 'Project Management', category: 'Management' },
          { id: 'cap-007', name: 'Finance Management', category: 'Finance' },
          { id: 'cap-008', name: 'Financial Analysis', category: 'Finance' },
          { id: 'cap-009', name: 'Recruiting', category: 'Human Resources' }
        ],
        relationships: [
          // Reporting relationships
          { type: 'reporting', from: 'user-002', to: 'user-001' },
          { type: 'reporting', from: 'user-003', to: 'user-004' },
          { type: 'reporting', from: 'user-004', to: 'user-006' },
          
          // Department memberships
          { type: 'department', from: 'user-001', to: 'dept-001' },
          { type: 'department', from: 'user-002', to: 'dept-001' },
          { type: 'department', from: 'user-003', to: 'dept-002' },
          { type: 'department', from: 'user-004', to: 'dept-002' },
          
          // Cross-departmental workflows
          { type: 'workflow-flow', from: 'dept-001', to: 'dept-002', weight: 3 },
          { type: 'workflow-flow', from: 'dept-002', to: 'dept-003', weight: 2 },
          { type: 'workflow-flow', from: 'dept-001', to: 'dept-003', weight: 1 }
        ],
        metadata: {
          totalUsers: 4,
          activeDepartments: 4,
          lastUpdated: new Date().toISOString()
        }
      };

      // Filter data based on params
      let filteredUsers = mockData.users;
      let filteredDepartments = mockData.departments;

      if (!params.filters.showUsers) {
        filteredUsers = [];
      }

      if (!params.filters.showDepartments) {
        filteredDepartments = [];
      }

      // Filter by active users only
      filteredUsers = filteredUsers.filter(user => user.isActive);

      return {
        ...mockData,
        users: filteredUsers,
        departments: filteredDepartments,
        metadata: {
          ...mockData.metadata,
          totalUsers: filteredUsers.length,
          activeDepartments: filteredDepartments.length
        }
      };
    } catch (error) {
      console.error('Error fetching organizational data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  return {
    fetchOrganizationalData,
    isLoading
  };
};
