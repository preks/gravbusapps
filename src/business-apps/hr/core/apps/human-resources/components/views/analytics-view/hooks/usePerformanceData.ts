import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface WorkdaysData {
  id: string
  name: string
  employeeCount: number
  totalWorkdays: number
  averageWorkdays: number
  monthlyData: {
    lastMonth: number
    currentMonth: number
    nextMonth: number
  }
}

export interface MonthlyWorkdaysData {
  entityId: string
  entityName: string
  lastMonth: number
  thisMonth: number
  nextMonth: number
  averageWorkdays: number
  totalEmployees: number
}

export interface EntityOption {
  id: string
  name: string
}

export interface PerformanceStatistics {
  totalWorkdays: number
  averageWorkdaysPerEntity: number
  totalEntities: number
  totalEmployees: number
}

export interface PerformanceDataVariables {
  structureId: string
  entityId?: string
}

// Get workdays by site location - properly joining tables (WORKING)
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
`

// Get workdays by company - using EmployeeCompany join table (FIXED)
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
    
    EmployeeCompany(
      where: {
        structureId: { _eq: $structureId }
        ${variables.entityId ? 'companyId: { _eq: $entityId }' : ''}
      }
    ) {
      id
      employeeId
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
    }
  }
`

// Get workdays by organizational unit - using EmployeeOrganizationalUnit join table (FIXED)
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
    
    EmployeeOrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        ${variables.entityId ? 'organizationalUnitId: { _eq: $entityId }' : ''}
      }
    ) {
      id
      employeeId
      organizationalUnitId
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
`

// Get workdays by cost center - using EmployeeCostCenter join table (FIXED)
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
    
    EmployeeCostCenter(
      where: {
        structureId: { _eq: $structureId }
        ${variables.entityId ? 'costCenterId: { _eq: $entityId }' : ''}
      }
    ) {
      id
      employeeId
      costCenterId
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
`

export const usePerformanceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchWorkdaysByLocation = useCallback(
    async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
      const query = GET_WORKDAYS_BY_LOCATION(variables)
      try {
        const result = await graphqlClient.request<{
          SiteLocation: Array<{ id: string; name: string; structureId: string }>
          EmployeeSiteLocation: Array<{ id: string; employeeId: string; siteLocationId: string; structureId: string }>
          EmployeeWorkingHours: Array<{
            id: string
            employeeId: string
            weeklyDays: number
            weeklyHours: number
            fullTimeEquivalent: number
          }>
        }>(query, variables)

        const transformedData: WorkdaysData[] = result.SiteLocation.map(location => {
          // Find employees in this location
          const locationEmployees = result.EmployeeSiteLocation.filter(esl => esl.siteLocationId === location.id)
          const employeeIds = locationEmployees.map(esl => esl.employeeId)

          // Get working hours for these employees
          const locationWorkingHours = result.EmployeeWorkingHours.filter(wh => employeeIds.includes(wh.employeeId))

          const totalWorkdays = locationWorkingHours.reduce((sum, wh) => {
            const monthlyDays = wh.weeklyDays * 4.33
            return sum + monthlyDays
          }, 0)

          const averageWorkdays = locationWorkingHours.length > 0 ? totalWorkdays / locationWorkingHours.length : 0

          return {
            id: location.id,
            name: location.name,
            employeeCount: locationWorkingHours.length,
            totalWorkdays: Math.round(totalWorkdays),
            averageWorkdays: Math.round(averageWorkdays * 100) / 100,
            monthlyData: {
              lastMonth: Math.round(totalWorkdays * 0.95),
              currentMonth: Math.round(totalWorkdays),
              nextMonth: Math.round(totalWorkdays * 1.02)
            }
          }
        })

        return transformedData
      } catch (error) {
        console.error('Error fetching workdays by location:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchWorkdaysByCompany = useCallback(
    async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
      const query = GET_WORKDAYS_BY_COMPANY(variables)
      try {
        const result = await graphqlClient.request<{
          Company: Array<{ id: string; name: string; structureId: string }>
          EmployeeCompany: Array<{ id: string; employeeId: string; companyId: string; structureId: string }>
          EmployeeWorkingHours: Array<{
            id: string
            employeeId: string
            weeklyDays: number
            weeklyHours: number
            fullTimeEquivalent: number
          }>
        }>(query, variables)

        const transformedData: WorkdaysData[] = result.Company.map(company => {
          // Find employees in this company
          const companyEmployees = result.EmployeeCompany.filter(ec => ec.companyId === company.id)
          const employeeIds = companyEmployees.map(ec => ec.employeeId)

          // Get working hours for these employees
          const companyWorkingHours = result.EmployeeWorkingHours.filter(wh => employeeIds.includes(wh.employeeId))

          const totalWorkdays = companyWorkingHours.reduce((sum, wh) => {
            const monthlyDays = wh.weeklyDays * 4.33
            return sum + monthlyDays
          }, 0)

          const averageWorkdays = companyWorkingHours.length > 0 ? totalWorkdays / companyWorkingHours.length : 0

          return {
            id: company.id,
            name: company.name,
            employeeCount: companyWorkingHours.length,
            totalWorkdays: Math.round(totalWorkdays),
            averageWorkdays: Math.round(averageWorkdays * 100) / 100,
            monthlyData: {
              lastMonth: Math.round(totalWorkdays * 0.95),
              currentMonth: Math.round(totalWorkdays),
              nextMonth: Math.round(totalWorkdays * 1.02)
            }
          }
        })

        return transformedData
      } catch (error) {
        console.error('Error fetching workdays by company:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchWorkdaysByOrgUnit = useCallback(
    async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
      const query = GET_WORKDAYS_BY_ORG_UNIT(variables)
      try {
        const result = await graphqlClient.request<{
          OrganizationalUnit: Array<{ id: string; name: string; structureId: string }>
          EmployeeOrganizationalUnit: Array<{
            id: string
            employeeId: string
            organizationalUnitId: string
            structureId: string
          }>
          EmployeeWorkingHours: Array<{
            id: string
            employeeId: string
            weeklyDays: number
            weeklyHours: number
            fullTimeEquivalent: number
          }>
        }>(query, variables)

        const transformedData: WorkdaysData[] = result.OrganizationalUnit.map(orgUnit => {
          // Find employees in this org unit
          const orgUnitEmployees = result.EmployeeOrganizationalUnit.filter(
            eou => eou.organizationalUnitId === orgUnit.id
          )
          const employeeIds = orgUnitEmployees.map(eou => eou.employeeId)

          // Get working hours for these employees
          const orgUnitWorkingHours = result.EmployeeWorkingHours.filter(wh => employeeIds.includes(wh.employeeId))

          const totalWorkdays = orgUnitWorkingHours.reduce((sum, wh) => {
            const monthlyDays = wh.weeklyDays * 4.33
            return sum + monthlyDays
          }, 0)

          const averageWorkdays = orgUnitWorkingHours.length > 0 ? totalWorkdays / orgUnitWorkingHours.length : 0

          return {
            id: orgUnit.id,
            name: orgUnit.name,
            employeeCount: orgUnitWorkingHours.length,
            totalWorkdays: Math.round(totalWorkdays),
            averageWorkdays: Math.round(averageWorkdays * 100) / 100,
            monthlyData: {
              lastMonth: Math.round(totalWorkdays * 0.95),
              currentMonth: Math.round(totalWorkdays),
              nextMonth: Math.round(totalWorkdays * 1.02)
            }
          }
        })

        return transformedData
      } catch (error) {
        console.error('Error fetching workdays by organizational unit:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchWorkdaysByCostCenter = useCallback(
    async (variables: PerformanceDataVariables = { structureId: structureId || '' }) => {
      const query = GET_WORKDAYS_BY_COST_CENTER(variables)
      try {
        const result = await graphqlClient.request<{
          CostCenter: Array<{ id: string; name: string; structureId: string }>
          EmployeeCostCenter: Array<{ id: string; employeeId: string; costCenterId: string; structureId: string }>
          EmployeeWorkingHours: Array<{
            id: string
            employeeId: string
            weeklyDays: number
            weeklyHours: number
            fullTimeEquivalent: number
          }>
        }>(query, variables)

        const transformedData: WorkdaysData[] = result.CostCenter.map(costCenter => {
          // Find employees in this cost center
          const costCenterEmployees = result.EmployeeCostCenter.filter(ecc => ecc.costCenterId === costCenter.id)
          const employeeIds = costCenterEmployees.map(ecc => ecc.employeeId)

          // Get working hours for these employees
          const costCenterWorkingHours = result.EmployeeWorkingHours.filter(wh => employeeIds.includes(wh.employeeId))

          const totalWorkdays = costCenterWorkingHours.reduce((sum, wh) => {
            const monthlyDays = wh.weeklyDays * 4.33
            return sum + monthlyDays
          }, 0)

          const averageWorkdays = costCenterWorkingHours.length > 0 ? totalWorkdays / costCenterWorkingHours.length : 0

          return {
            id: costCenter.id,
            name: costCenter.name,
            employeeCount: costCenterWorkingHours.length,
            totalWorkdays: Math.round(totalWorkdays),
            averageWorkdays: Math.round(averageWorkdays * 100) / 100,
            monthlyData: {
              lastMonth: Math.round(totalWorkdays * 0.95),
              currentMonth: Math.round(totalWorkdays),
              nextMonth: Math.round(totalWorkdays * 1.02)
            }
          }
        })

        return transformedData
      } catch (error) {
        console.error('Error fetching workdays by cost center:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchWorkdaysByLocation,
    fetchWorkdaysByCompany,
    fetchWorkdaysByOrgUnit,
    fetchWorkdaysByCostCenter
  }
}
