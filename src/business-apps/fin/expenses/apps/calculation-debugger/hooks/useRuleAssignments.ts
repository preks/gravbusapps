import { useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface RuleAssignment {
  id: string
  assignmentOrder: number
  cascading: boolean
  applicants: boolean
  activeFrom: string
  activeTo: string
  // Assignment criteria
  employeeId?: string
  employee?: {
    id: string
    firstName: string
    lastName: string
  }
  companyId?: string
  company?: {
    id: string
    name: string
  }
  organizationalUnitId?: string
  organizationalUnit?: {
    id: string
    name: string
  }
  siteLocationId?: string
  siteLocation?: {
    id: string
    name: string
  }
  contractTypeRef?: string
  contractType?: {
    id: string
    code: string
    description: string
  }
  employmentTypeRef?: string
  employmentType?: {
    id: string
    code: string
    description: string
  }
  // The rule
  expenseRuleId: string
  expenseRule: {
    id: string
    name: string
    code: string
    activeFrom: string
    activeTo: string
    countryRef?: string
    country?: {
      id: string
      displayName: string
    }
    calculationTypeRef?: string
    calculationType?: {
      id: string
      displayName: string
    }
  }
}

export interface ExpenseRuleWithAssignments {
  id: string
  name: string
  code: string
  activeFrom: string
  activeTo: string
  countryRef?: string
  country?: {
    id: string
    code: string
    description: string
  }
  calculationTypeRef?: string
  calculationType?: {
    id: string
    code: string
    description: string
  }
  assignments: RuleAssignment[]
}

export interface EmployeeRuleStatus {
  employeeId: string
  employeeName: string
  hasRule: boolean
  ruleName?: string
  ruleCode?: string
  ruleId?: string
  ruleActiveFrom?: string
  assignmentActiveFrom?: string
  checkDate: string
  error?: string
}

const EMPLOYEES_BY_CRITERIA_QUERY = `
  query GetEmployeesByCriteria($where: EmployeePositionBoolExp!, $limit: Int) {
    EmployeePosition(
      where: $where
      limit: $limit
      orderBy: { lastName: ASC }
    ) {
      id
      employeeId
      firstName
      lastName
      employee {
        id
        code
        pictureThumbnail
      }
      company {
        id
        name
      }
      organizationalUnit {
        id
        name
      }
      siteLocation {
        id
        name
      }
    }
  }
`

const RULES_WITH_ASSIGNMENTS_QUERY = `
  query GetRulesWithAssignments($now: timestamptz!) {
    ExpenseRule(
      where: {
        activeFrom: { _lte: $now }
        activeTo: { _gte: $now }
        recordState: { _eq: "active" }
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      activeFrom
      activeTo
      countryRef
      country {
        id
        code
        description
      }
      calculationTypeRef
      calculationType {
        id
        code
        description
      }
      expenseRuleAssignment(
        where: {
          activeFrom: { _lte: $now }
          activeTo: { _gte: $now }
          recordState: { _eq: "active" }
        }
        orderBy: { assignmentOrder: ASC }
      ) {
        id
        assignmentOrder
        cascading
        applicants
        activeFrom
        activeTo
        employeeId
        employee {
          id
          firstName
          lastName
        }
        companyId
        company {
          id
          name
        }
        organizationalUnitId
        organizationalUnit {
          id
          name
        }
        siteLocationId
        siteLocation {
          id
          name
        }
        contractTypeRef
        contractType {
          id
          code
          description
        }
        employmentTypeRef
        employmentType {
          id
          code
          description
        }
      }
    }
  }
`

export interface CoveredEmployee {
  id: string
  firstName: string
  lastName: string
  code?: string
  avatarUrl?: string
  companyName?: string
  orgUnitName?: string
  siteLocationName?: string
}

interface UseRuleAssignmentsReturn {
  rules: ExpenseRuleWithAssignments[]
  loading: boolean
  error: string | null
  fetchRules: () => Promise<void>
  employeeStatuses: EmployeeRuleStatus[]
  checkingEmployees: boolean
  checkEmployeeRules: (employeeIds: string[], accessToken: string, date?: Date) => Promise<void>
  clearEmployeeStatuses: () => void
  fetchCoveredEmployees: (assignment: RuleAssignment) => Promise<CoveredEmployee[]>
}

export function useRuleAssignments(): UseRuleAssignmentsReturn {
  const [rules, setRules] = useState<ExpenseRuleWithAssignments[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeRuleStatus[]>([])
  const [checkingEmployees, setCheckingEmployees] = useState(false)

  const graphQLClient = useGraphqlClient()

  const fetchRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await graphQLClient.request(RULES_WITH_ASSIGNMENTS_QUERY, {
        now: new Date().toISOString()
      })

      if (result?.ExpenseRule) {
        const rulesWithAssignments: ExpenseRuleWithAssignments[] = result.ExpenseRule.map((rule: any) => ({
          id: rule.id,
          name: rule.name,
          code: rule.code,
          activeFrom: rule.activeFrom,
          activeTo: rule.activeTo,
          countryRef: rule.countryRef,
          country: rule.country,
          calculationTypeRef: rule.calculationTypeRef,
          calculationType: rule.calculationType,
          assignments: rule.expenseRuleAssignment || []
        }))
        setRules(rulesWithAssignments)
      }
    } catch (err) {
      console.error('[useRuleAssignments] Error fetching rules:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }, [graphQLClient])

  const checkEmployeeRules = useCallback(async (employeeIds: string[], accessToken: string, date?: Date) => {
    setCheckingEmployees(true)
    const checkDate = date || new Date()
    const dateStr = checkDate.toISOString()

    // Use the same base URL pattern as useCalculationTrace
    const baseUrl = `${window.location.origin}/processes/employee-expense/debug/calculation`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }

    const statuses: EmployeeRuleStatus[] = []

    for (const employeeId of employeeIds) {
      try {
        const response = await fetch(
          `${baseUrl}/debug/rule-assignment/${employeeId}?allowanceDate=${encodeURIComponent(dateStr)}`,
          { headers }
        )

        if (response.ok) {
          const data = await response.json()
          statuses.push({
            employeeId,
            employeeName: employeeId, // Will be resolved by caller if needed
            hasRule: !!data.appliedRule,
            ruleName: data.appliedRule?.ruleName,
            ruleCode: data.appliedRule?.ruleCode,
            ruleId: data.appliedRule?.ruleId,
            ruleActiveFrom: data.appliedRule?.activeFrom,
            assignmentActiveFrom: data.appliedRule?.assignmentActiveFrom,
            checkDate: dateStr
          })
        } else {
          statuses.push({
            employeeId,
            employeeName: employeeId,
            hasRule: false,
            checkDate: dateStr,
            error: `HTTP ${response.status}`
          })
        }
      } catch (err) {
        statuses.push({
          employeeId,
          employeeName: employeeId,
          hasRule: false,
          checkDate: dateStr,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    setEmployeeStatuses(statuses)
    setCheckingEmployees(false)
  }, [])

  const clearEmployeeStatuses = useCallback(() => {
    setEmployeeStatuses([])
  }, [])

  const fetchCoveredEmployees = useCallback(
    async (assignment: RuleAssignment): Promise<CoveredEmployee[]> => {
      // Build where clause based on assignment criteria
      const conditions: any[] = []

      // If assigned to specific employee, just return that employee
      if (assignment.employeeId) {
        conditions.push({ employeeId: { _eq: assignment.employeeId } })
      }

      // Filter by company
      if (assignment.companyId) {
        conditions.push({ companyId: { _eq: assignment.companyId } })
      }

      // Filter by org unit
      if (assignment.organizationalUnitId) {
        conditions.push({ organizationalUnitId: { _eq: assignment.organizationalUnitId } })
      }

      // Filter by site location
      if (assignment.siteLocationId) {
        conditions.push({ siteLocationId: { _eq: assignment.siteLocationId } })
      }

      // If no criteria, it's a catch-all - don't fetch everyone
      if (conditions.length === 0) {
        return []
      }

      const where = conditions.length === 1 ? conditions[0] : { _and: conditions }

      try {
        const result = await graphQLClient.request(EMPLOYEES_BY_CRITERIA_QUERY, {
          where,
          limit: 100 // Limit to 100 employees
        })

        if (result?.EmployeePosition) {
          // Deduplicate by employeeId (an employee might have multiple positions)
          const employeeMap = new Map<string, CoveredEmployee>()

          for (const pos of result.EmployeePosition) {
            if (pos.employeeId && !employeeMap.has(pos.employeeId)) {
              // pictureThumbnail is base64 encoded - prefix with data URI
              const avatarUrl = pos.employee?.pictureThumbnail
                ? `data:image/png;base64,${pos.employee.pictureThumbnail}`
                : undefined
              employeeMap.set(pos.employeeId, {
                id: pos.employeeId,
                firstName: pos.firstName || '',
                lastName: pos.lastName || '',
                code: pos.employee?.code,
                avatarUrl,
                companyName: pos.company?.name,
                orgUnitName: pos.organizationalUnit?.name,
                siteLocationName: pos.siteLocation?.name
              })
            }
          }

          return Array.from(employeeMap.values())
        }
        return []
      } catch (err) {
        console.error('[useRuleAssignments] Error fetching covered employees:', err)
        return []
      }
    },
    [graphQLClient]
  )

  return {
    rules,
    loading,
    error,
    fetchRules,
    employeeStatuses,
    checkingEmployees,
    checkEmployeeRules,
    clearEmployeeStatuses,
    fetchCoveredEmployees
  }
}
