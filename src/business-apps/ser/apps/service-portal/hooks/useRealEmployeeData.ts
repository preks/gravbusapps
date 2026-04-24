import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

// Real employee data types based on GraphQL schema
export interface RealEmployeeData {
  id: string // EmployeePosition.id
  employeeId: string // EmployeePosition.employeeId
  actualEmployeeId?: string // Employee.id - the real Employee table ID that might match requesterId
  firstName: string
  lastName: string
  displayName: string
  email: string
  jobTitle: string
  department: string
  employmentType: string
  contractType: string
  profilePicture?: string
  startDate?: string
  supervisorName?: string
  location?: string
  companyName?: string
}

export interface RealJobPositionData {
  id: string
  name: string
  jobFunction?: string
  jobLevel?: string
  employmentType?: string
  contractType?: string
  jobProfile?: string
  department?: string
  departmentId?: string // Added for cascading dropdown filtering
  jobFamilyValue?: string
}

export interface RealOrganizationalUnit {
  id: string
  name: string
  description?: string
  type?: string
}

// GraphQL query to fetch employees for service requests
const GET_EMPLOYEES_FOR_SERVICE_REQUESTS = `
  query GetEmployeesForServiceRequests($structureId: uuid!, $limit: Int!, $search: String) {
    EmployeePosition(
      where: {
        structureId: { _eq: $structureId },
        employee: { isDeleted: { _eq: false } },
        _or: [
          { firstName: { _ilike: $search } },
          { lastName: { _ilike: $search } },
          { employee: { displayName: { _ilike: $search } } }
        ]
      },
      limit: $limit,
      orderBy: [{ firstName: ASC }, { lastName: ASC }]
    ) {
      id
      employeeId
      firstName
      lastName
      hireDate
      employee {
        id
        displayName
        pictureThumbnail
        communication(where: { type: { value: { _eq: "Email" } } }) {
          value
        }
        workingCondition {
          contractType {
            value
          }
          employmentType {
            value
          }
          hireDate
        }
      }
      jobPosition {
        name
        jobFunction {
          name
        }
        jobLevel {
          name
        }
      }
      organizationalUnit {
        name
      }
      supervisor {
        firstName
        lastName
        displayName
      }
      company {
        name
      }
      siteLocation {
        name
      }
    }
  }
`

// GraphQL query to fetch VACANT job positions only (matching HR apps pattern)
const GET_JOB_POSITIONS = `
  query GetJobPositions($structureId: uuid!, $limit: Int!, $search: String, $vacant: Boolean!) {
    JobPosition(
      where: {
        _and: [
          {
            organizationalUnitEmployees: {
              structureId: { _eq: $structureId },
              employeeId: { _isNull: $vacant }
            }
          },
          { isDeleted: { _eq: false } },
          {
            _or: [
              { name: { _ilike: $search } },
              { jobFunction: { name: { _ilike: $search } } },
              { jobFunction: { jobFamily: { code: { _ilike: $search } } } },
              { jobLevel: { name: { _ilike: $search } } },
              { jobProfile: { name: { _ilike: $search } } }
            ]
          }
        ]
      },
      limit: $limit,
      orderBy: { name: ASC }
    ) {
      id
      name
      jobFunction { 
        id 
        name 
        jobFamily {
          code
        }
      }
      jobLevel { 
        id 
        name 
      }
      jobProfile { 
        id 
        name 
      }
      employmentType {
        value
        id
      }
      contractType {
        value
        id
      }
      organizationalUnitEmployees {
        organizationalUnit {
          name
          id
        }
      }
    }
  }
`

// GraphQL query to fetch organizational units (departments)
const GET_ORGANIZATIONAL_UNITS = `
  query GetOrganizationalUnits($structureId: uuid!, $limit: Int!, $search: String) {
    OrganizationalUnit(
      where: {
        structureId: { _eq: $structureId },
        isDeleted: { _eq: false },
        name: { _ilike: $search }
      },
      limit: $limit,
      orderBy: { name: ASC }
    ) {
      id
      name
      description
      type
    }
  }
`

export const useRealEmployeeData = (context: BusinessAppContextProps) => {
  const [employees, setEmployees] = useState<RealEmployeeData[]>([])
  const [jobPositions, setJobPositions] = useState<RealJobPositionData[]>([])
  const [departments, setDepartments] = useState<RealOrganizationalUnit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch employees
  const fetchEmployees = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()

        // Skip if no valid structureId (e.g., when running in dev mode without platform context)
        if (!structureId) {
          setIsLoading(false)
          return
        }

        const searchPattern = search ? `%${search}%` : '%'

        const result = await graphqlClient.request(GET_EMPLOYEES_FOR_SERVICE_REQUESTS, {
          structureId,
          limit: 100,
          search: searchPattern
        })

        const employeeData: RealEmployeeData[] = result.EmployeePosition.filter(
          (emp: any) => emp.firstName && emp.lastName
        ) // Only employees with valid names
          .map((emp: any) => {
            const workingCondition = emp.employee?.workingCondition?.[0]
            const emailCommunication = emp.employee?.communication?.[0]

            return {
              id: emp.id, // EmployeePosition.id
              employeeId: emp.employeeId, // EmployeePosition.employeeId
              actualEmployeeId: emp.employee?.id || '', // Employee.id - this is likely what requesterId matches!
              firstName: emp.firstName.trim(),
              lastName: emp.lastName.trim(),
              displayName: emp.employee?.displayName?.trim() || `${emp.firstName.trim()} ${emp.lastName.trim()}`,
              email: emailCommunication?.value || '',
              jobTitle: emp.jobPosition?.name || '',
              department: emp.organizationalUnit?.name || '',
              employmentType: workingCondition?.employmentType?.value || '',
              contractType: workingCondition?.contractType?.value || '',
              profilePicture: emp.employee?.pictureThumbnail,
              startDate: workingCondition?.hireDate || emp.hireDate,
              supervisorName:
                emp.supervisor?.displayName ||
                (emp.supervisor ? `${emp.supervisor.firstName} ${emp.supervisor.lastName}` : ''),
              location: emp.siteLocation?.name || '',
              companyName: emp.company?.name || ''
            }
          })

        setEmployees(employeeData)
      } catch (err) {
        console.error('Error fetching employees:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employees')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Fetch job positions
  const fetchJobPositions = useCallback(
    async (search: string = '', departmentId?: string) => {
      if (!context.accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()

        // Skip if no valid structureId (e.g., when running in dev mode without platform context)
        if (!structureId) {
          setIsLoading(false)
          return
        }

        const searchPattern = search ? `%${search}%` : '%'

        const result = await graphqlClient.request(GET_JOB_POSITIONS, {
          structureId,
          limit: 200,
          search: searchPattern,
          vacant: true // Only fetch vacant positions (no employee assigned)
        })

        let jobPositionData: RealJobPositionData[] = result.JobPosition.filter(
          (pos: any) => pos.name && pos.name.trim().length > 0
        ) // Only positions with valid names
          .map((pos: any) => ({
            id: pos.id,
            name: pos.name.trim(),
            jobFunction: pos.jobFunction?.name || '',
            jobLevel: pos.jobLevel?.name || '',
            employmentType: pos.employmentType?.value || '',
            contractType: pos.contractType?.value || '',
            // Additional data from the improved query
            jobProfile: pos.jobProfile?.name || '',
            department: pos.organizationalUnitEmployees?.[0]?.organizationalUnit?.name || '',
            departmentId: pos.organizationalUnitEmployees?.[0]?.organizationalUnit?.id || '',
            jobFamilyValue: pos.jobFunction?.jobFamily?.value || ''
          }))

        // Filter by department if specified
        if (departmentId) {
          jobPositionData = jobPositionData.filter(pos => pos.departmentId === departmentId)
        }

        setJobPositions(jobPositionData)
      } catch (err) {
        console.error('Error fetching job positions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch job positions')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Fetch organizational units (departments)
  const fetchDepartments = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()

        // Skip if no valid structureId (e.g., when running in dev mode without platform context)
        if (!structureId) {
          setIsLoading(false)
          return
        }

        const searchPattern = search ? `%${search}%` : '%'

        const result = await graphqlClient.request(GET_ORGANIZATIONAL_UNITS, {
          structureId,
          limit: 100,
          search: searchPattern
        })

        const departmentData: RealOrganizationalUnit[] = result.OrganizationalUnit.filter(
          (unit: any) => unit.name && unit.name.trim().length > 0
        ) // Only departments with valid names
          .map((unit: any) => ({
            id: unit.id,
            name: unit.name.trim(),
            description: '', // Don't show descriptions to keep dropdowns compact
            type: unit.type || ''
          }))

        setDepartments(departmentData)
      } catch (err) {
        console.error('Error fetching departments:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch departments')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Initial data loading
  useEffect(() => {
    if (context.accessToken) {
      Promise.all([fetchEmployees(), fetchJobPositions(), fetchDepartments()])
    }
  }, [context.accessToken, fetchEmployees, fetchJobPositions, fetchDepartments])

  return {
    employees,
    jobPositions,
    departments,
    isLoading,
    error,
    fetchEmployees,
    fetchJobPositions,
    fetchDepartments,
    refetch: (departmentId?: string) => {
      fetchEmployees()
      fetchJobPositions('', departmentId)
      fetchDepartments()
    }
  }
}

// Helper functions for form integration
export const getEmployeeOptions = (employees: RealEmployeeData[]) => {
  return employees.map(emp => ({
    value: emp.employeeId,
    label: emp.displayName,
    jobTitle: emp.jobTitle,
    department: emp.department,
    email: emp.email
  }))
}

export const getJobPositionOptions = (jobPositions: RealJobPositionData[]) => {
  return jobPositions.map(pos => ({
    value: pos.id,
    label: pos.name,
    jobFunction: pos.jobFunction,
    jobLevel: pos.jobLevel,
    departmentId: pos.departmentId // Added for cascading dropdown filtering
  }))
}

export const getDepartmentOptions = (departments: RealOrganizationalUnit[]) => {
  return departments.map(dept => ({
    value: dept.id,
    label: dept.name
    // No description to keep dropdowns compact like other apps
  }))
}
