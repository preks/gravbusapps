import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';

export interface WorkdaysData {
  id: string;
  name: string;
  employeeCount: number;
  totalWorkdays: number;
  averageWorkdays: number;
  monthlyData: {
    lastMonth: number;
    currentMonth: number;
    nextMonth: number;
  };
}

// Legacy types for backward compatibility with existing components
export interface MonthlyWorkdaysData {
  entityId: string;
  entityName: string;
  lastMonth: number;
  thisMonth: number;
  nextMonth: number;
  averageWorkdays: number;
  totalEmployees: number;
}

export interface WorkdaysTrendData {
  month: string;
  workdays: number;
  employees: number;
}

export interface PerformanceStatistics {
  totalWorkdays: number;
  averageWorkdaysPerEntity: number;
  totalEntities: number;
  totalEmployees: number;
}

export interface PerformanceDataVariables {
  structureId: string;
  entityId?: string;
}

// Get workdays by site location - properly joining tables
export const GET_WORKDAYS_BY_LOCATION = (variables: PerformanceDataVariables): string => `
  query GetWorkdaysByLocation($structureId: uuid!, $entityId: uuid) {
    SiteLocation(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        ${variables.entityId ? 'id: { _eq: $entityId }' : ''}
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      structureId
    }
    
    EmployeeSiteLocation(
      where: {
        structureId: { _eq: $structureId }
        ${variables.entityId ? 'siteLocationId: { _eq: $entityId }' : ''}
      }
    ) {
      id
      employeeId
      siteLocationId
      structureId
    }
    
    EmployeeWorkingHours(
      where: {
        isDeleted: { _eq: false }
        weeklyDays: { _isNull: false }
        _and: [
          { _or: [{ activeFrom: { _eq: null } }, { activeFrom: { _lte: "now()" } }] }
          { _or: [{ activeTo: { _eq: null } }, { activeTo: { _gte: "now()" } }] }
        ]
      }
    ) {
      id
      employeeId
      weeklyDays
      weeklyHours
      fullTimeEquivalent
    }
  }
`;

// Get workdays by company - using organizational units
export const GET_WORKDAYS_BY_COMPANY = (variables: PerformanceDataVariables): string => `
  query GetWorkdaysByCompany($structureId: uuid!, $entityId: uuid) {
    Company(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        ${variables.entityId ? 'id: { _eq: $entityId }' : ''}
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      structureId
    }
    
    OrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        ${variables.entityId ? 'companyId: { _eq: $entityId }' : ''}
      }
    ) {
      id
      name
      companyId
      structureId
    }
    
    EmployeeWorkingHours(
      where: {
        isDeleted: { _eq: false }
        weeklyDays: { _isNull: false }
        _and: [
          { _or: [{ activeFrom: { _eq: null } }, { activeFrom: { _lte: "now()" } }] }
          { _or: [{ activeTo: { _eq: null } }, { activeTo: { _gte: "now()" } }] }
        ]
      }
    ) {
      id
      employeeId
      weeklyDays
      weeklyHours
      fullTimeEquivalent
      employee {
        id
        organizationalUnits {
          id
          organizationalUnitId
          structureId
        }
      }
    }
  }
`;

// Get workdays by organizational unit
export const GET_WORKDAYS_BY_ORG_UNIT = (variables: PerformanceDataVariables): string => `
  query GetWorkdaysByOrgUnit($structureId: uuid!, $entityId: uuid) {
    OrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        ${variables.entityId ? 'id: { _eq: $entityId }' : ''}
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      structureId
    }
    
    EmployeeWorkingHours(
      where: {
        isDeleted: { _eq: false }
        weeklyDays: { _isNull: false }
        _and: [
          { _or: [{ activeFrom: { _eq: null } }, { activeFrom: { _lte: "now()" } }] }
          { _or: [{ activeTo: { _eq: null } }, { activeTo: { _gte: "now()" } }] }
        ]
      }
    ) {
      id
      employeeId
      weeklyDays
      weeklyHours
      fullTimeEquivalent
      employee {
        id
        organizationalUnits {
          id
          organizationalUnitId
          structureId
        }
      }
    }
  }
`;

// Get workdays by cost center
export const GET_WORKDAYS_BY_COST_CENTER = (variables: PerformanceDataVariables): string => `
  query GetWorkdaysByCostCenter($structureId: uuid!, $entityId: uuid) {
    CostCenter(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        ${variables.entityId ? 'id: { _eq: $entityId }' : ''}
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      structureId
    }
    
    EmployeeWorkingHours(
      where: {
        isDeleted: { _eq: false }
        weeklyDays: { _isNull: false }
        _and: [
          { _or: [{ activeFrom: { _eq: null } }, { activeFrom: { _lte: "now()" } }] }
          { _or: [{ activeTo: { _eq: null } }, { activeTo: { _gte: "now()" } }] }
        ]
      }
    ) {
      id
      employeeId
      weeklyDays
      weeklyHours
      fullTimeEquivalent
      employee {
        id
        costCenters {
          id
          costCenterId
          structureId
        }
      }
    }
  }
`;

export const usePerformanceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const structureId = getCurrentActiveStructureId();

  const fetchWorkdaysByLocation = useCallback(async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
    const query = GET_WORKDAYS_BY_LOCATION(variables);
    try {
      const result = await graphqlClient.request<{
        SiteLocation: Array<{ id: string; name: string; structureId: string }>;
        EmployeeSiteLocation: Array<{ id: string; employeeId: string; siteLocationId: string; structureId: string }>;
        EmployeeWorkingHours: Array<{ id: string; employeeId: string; weeklyDays: number; weeklyHours: number; fullTimeEquivalent: number }>;
      }>(query, variables);
      
      // Transform data to match WorkdaysData interface
      const transformedData: WorkdaysData[] = result.SiteLocation.map(location => {
        // Find employees for this location
        const locationEmployees = result.EmployeeSiteLocation.filter(
          emp => emp.siteLocationId === location.id
        );
        
        // Find working hours for these employees
        const employeeWorkingHours = result.EmployeeWorkingHours.filter(
          wh => locationEmployees.some(emp => emp.employeeId === wh.employeeId)
        );
        
        const totalWorkdays = employeeWorkingHours.reduce((sum, wh) => {
          // Convert weekly days to monthly (weekly * 4.33 weeks per month)
          const monthlyDays = wh.weeklyDays * 4.33;
          return sum + monthlyDays;
        }, 0);
        
        const averageWorkdays = employeeWorkingHours.length > 0 ? totalWorkdays / employeeWorkingHours.length : 0;
        
        return {
          id: location.id,
          name: location.name,
          employeeCount: employeeWorkingHours.length,
          totalWorkdays: Math.round(totalWorkdays),
          averageWorkdays: Math.round(averageWorkdays * 100) / 100,
          monthlyData: {
            lastMonth: Math.round(totalWorkdays * 0.95), // Simulated data
            currentMonth: Math.round(totalWorkdays),
            nextMonth: Math.round(totalWorkdays * 1.02), // Simulated data
          },
        };
      });
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching workdays by location:', error);
      throw error;
    }
  }, [graphqlClient, structureId]);

  const fetchWorkdaysByCompany = useCallback(async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
    const query = GET_WORKDAYS_BY_COMPANY(variables);
    try {
      const result = await graphqlClient.request<{
        Company: Array<{ id: string; name: string; structureId: string }>;
        OrganizationalUnit: Array<{ id: string; name: string; companyId: string; structureId: string }>;
        EmployeeWorkingHours: Array<{ 
          id: string; 
          employeeId: string; 
          weeklyDays: number; 
          weeklyHours: number; 
          fullTimeEquivalent: number;
          employee: {
            id: string;
            organizationalUnits: Array<{ id: string; organizationalUnitId: string; structureId: string }>;
          };
        }>;
      }>(query, variables);
      
      // Transform data similar to location logic
      const transformedData: WorkdaysData[] = result.Company.map(company => {
        // Find org units for this company
        const companyOrgUnits = result.OrganizationalUnit.filter(
          ou => ou.companyId === company.id
        );
        
        // Find employees in these org units
        const companyEmployees = result.EmployeeWorkingHours.filter(wh =>
          wh.employee.organizationalUnits.some(empOu =>
            companyOrgUnits.some(cou => cou.id === empOu.organizationalUnitId)
          )
        );
        
        const totalWorkdays = companyEmployees.reduce((sum, wh) => {
          const monthlyDays = wh.weeklyDays * 4.33;
          return sum + monthlyDays;
        }, 0);
        
        const averageWorkdays = companyEmployees.length > 0 ? totalWorkdays / companyEmployees.length : 0;
        
        return {
          id: company.id,
          name: company.name,
          employeeCount: companyEmployees.length,
          totalWorkdays: Math.round(totalWorkdays),
          averageWorkdays: Math.round(averageWorkdays * 100) / 100,
          monthlyData: {
            lastMonth: Math.round(totalWorkdays * 0.95),
            currentMonth: Math.round(totalWorkdays),
            nextMonth: Math.round(totalWorkdays * 1.02),
          },
        };
      });
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching workdays by company:', error);
      throw error;
    }
  }, [graphqlClient, structureId]);

  const fetchWorkdaysByOrgUnit = useCallback(async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
    const query = GET_WORKDAYS_BY_ORG_UNIT(variables);
    try {
      const result = await graphqlClient.request<{
        OrganizationalUnit: Array<{ id: string; name: string; structureId: string }>;
        EmployeeWorkingHours: Array<{ 
          id: string; 
          employeeId: string; 
          weeklyDays: number; 
          weeklyHours: number; 
          fullTimeEquivalent: number;
          employee: {
            id: string;
            organizationalUnits: Array<{ id: string; organizationalUnitId: string; structureId: string }>;
          };
        }>;
      }>(query, variables);
      
      const transformedData: WorkdaysData[] = result.OrganizationalUnit.map(orgUnit => {
        // Find employees in this org unit
        const orgUnitEmployees = result.EmployeeWorkingHours.filter(wh =>
          wh.employee.organizationalUnits.some(empOu => empOu.organizationalUnitId === orgUnit.id)
        );
        
        const totalWorkdays = orgUnitEmployees.reduce((sum, wh) => {
          const monthlyDays = wh.weeklyDays * 4.33;
          return sum + monthlyDays;
        }, 0);
        
        const averageWorkdays = orgUnitEmployees.length > 0 ? totalWorkdays / orgUnitEmployees.length : 0;
        
        return {
          id: orgUnit.id,
          name: orgUnit.name,
          employeeCount: orgUnitEmployees.length,
          totalWorkdays: Math.round(totalWorkdays),
          averageWorkdays: Math.round(averageWorkdays * 100) / 100,
          monthlyData: {
            lastMonth: Math.round(totalWorkdays * 0.95),
            currentMonth: Math.round(totalWorkdays),
            nextMonth: Math.round(totalWorkdays * 1.02),
          },
        };
      });
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching workdays by org unit:', error);
      throw error;
    }
  }, [graphqlClient, structureId]);

  const fetchWorkdaysByCostCenter = useCallback(async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
    const query = GET_WORKDAYS_BY_COST_CENTER(variables);
    try {
      const result = await graphqlClient.request<{
        CostCenter: Array<{ id: string; name: string; structureId: string }>;
        EmployeeWorkingHours: Array<{ 
          id: string; 
          employeeId: string; 
          weeklyDays: number; 
          weeklyHours: number; 
          fullTimeEquivalent: number;
          employee: {
            id: string;
            costCenters: Array<{ id: string; costCenterId: string; structureId: string }>;
          };
        }>;
      }>(query, variables);
      
      const transformedData: WorkdaysData[] = result.CostCenter.map(costCenter => {
        // Find employees in this cost center
        const costCenterEmployees = result.EmployeeWorkingHours.filter(wh =>
          wh.employee.costCenters.some(empCc => empCc.costCenterId === costCenter.id)
        );
        
        const totalWorkdays = costCenterEmployees.reduce((sum, wh) => {
          const monthlyDays = wh.weeklyDays * 4.33;
          return sum + monthlyDays;
        }, 0);
        
        const averageWorkdays = costCenterEmployees.length > 0 ? totalWorkdays / costCenterEmployees.length : 0;
        
        return {
          id: costCenter.id,
          name: costCenter.name,
          employeeCount: costCenterEmployees.length,
          totalWorkdays: Math.round(totalWorkdays),
          averageWorkdays: Math.round(averageWorkdays * 100) / 100,
          monthlyData: {
            lastMonth: Math.round(totalWorkdays * 0.95),
            currentMonth: Math.round(totalWorkdays),
            nextMonth: Math.round(totalWorkdays * 1.02),
          },
        };
      });
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching workdays by cost center:', error);
      throw error;
    }
  }, [graphqlClient, structureId]);

  return {
    fetchWorkdaysByLocation,
    fetchWorkdaysByCompany,
    fetchWorkdaysByOrgUnit,
    fetchWorkdaysByCostCenter,
  };
}; 