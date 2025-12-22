import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseRuleAssignments, useGetExpenseRules } from '../queries/ExpenseRuleQueries'
import { expenseSettingsClient } from '../utils/ExpenseSettingsClient'
import {
  EnhancedExpenseRuleAssignment,
  ExpenseRuleAssignment,
  ExpenseRule,
  ExpenseSettingsStatistics,
  SaveExpenseRuleAssignmentInput,
  MileageRuleFormData,
  AllowanceRegionRuleFormData,
  RuleValidationResult,
  ExpenseRuleAssignmentFilters
} from '../types/ExpenseRuleTypes'

export interface UseExpenseSettingsIntegrationResult {
  // Data
  assignments: EnhancedExpenseRuleAssignment[]
  rules: ExpenseRule[]
  statistics: ExpenseSettingsStatistics
  totalAssignments: number

  // Loading states
  isLoading: boolean
  isAssignmentsLoading: boolean
  isRulesLoading: boolean
  isStatisticsLoading: boolean

  // Error states
  error: string | null

  // CRUD operations
  createAssignment: (data: SaveExpenseRuleAssignmentInput) => Promise<any>
  updateAssignment: (id: string, data: SaveExpenseRuleAssignmentInput) => Promise<any>
  deleteAssignment: (id: string) => Promise<any>

  // Mileage rules
  createMileageRule: (data: MileageRuleFormData) => Promise<any>
  updateMileageRule: (id: string, data: MileageRuleFormData, version?: number) => Promise<any>
  deleteMileageRule: (id: string) => Promise<any>

  // Travel region rules
  createTravelRegionRule: (data: AllowanceRegionRuleFormData) => Promise<any>
  updateTravelRegionRule: (id: string, data: AllowanceRegionRuleFormData, version?: number) => Promise<any>
  deleteTravelRegionRule: (id: string) => Promise<any>

  // Validation
  validateAssignment: (data: SaveExpenseRuleAssignmentInput) => Promise<RuleValidationResult>

  // Utility functions
  refetch: () => Promise<void>
  searchAssignments: (params: {
    search?: string
    filters?: ExpenseRuleAssignmentFilters
    orderBy?: any[]
    limit?: number
    offset?: number
  }) => Promise<void>
  searchRules: (params: { search?: string }) => Promise<void>
}

export interface UseExpenseSettingsIntegrationOptions {
  skipInitialLoad?: boolean
}

export const useExpenseSettingsIntegration = (
  context: BusinessAppContextProps,
  options?: UseExpenseSettingsIntegrationOptions
): UseExpenseSettingsIntegrationResult => {
  const { skipInitialLoad = false } = options || {}
  // State
  const [assignments, setAssignments] = useState<EnhancedExpenseRuleAssignment[]>([])
  const [totalAssignments, setTotalAssignments] = useState(0)
  const [rules, setRules] = useState<ExpenseRule[]>([])
  const [statistics, setStatistics] = useState<ExpenseSettingsStatistics>({
    totalRules: 0,
    activeAssignments: 0,
    standardRules: 0,
    customRules: 0,
    mileageRules: 0,
    regionRules: 0,
    recentChanges: 0,
    conflictingRules: 0
  })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false)
  const [isRulesLoading, setIsRulesLoading] = useState(false)
  const [isStatisticsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hooks
  const { fetchExpenseRuleAssignments } = useGetExpenseRuleAssignments(context)
  const { fetchExpenseRules } = useGetExpenseRules(context)

  // Initialize client with access token
  useEffect(() => {
    if (context.accessToken) {
      expenseSettingsClient.setAccessToken(context.accessToken)
    }
  }, [context.accessToken])

  // Transform assignment data for enhanced UI
  const transformAssignments = useCallback(
    (rawAssignments: ExpenseRuleAssignment[]): EnhancedExpenseRuleAssignment[] => {
      return rawAssignments.map(assignment => {
        const enhanced: EnhancedExpenseRuleAssignment = {
          ...assignment,
          displayName: `${assignment.expenseRule?.code || 'N/A'}${assignment.expenseRule?.name ? ` - ${assignment.expenseRule.name}` : ''}`,
          ruleCode: assignment.expenseRule?.code || '',
          ruleName: assignment.expenseRule?.name || '',
          companyName: assignment.company?.name || '',
          orgUnitName: assignment.organizationalUnit?.name || '',
          locationName: assignment.siteLocation?.name || '',
          employeeName: assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : '',
          employmentTypeName: assignment.employmentType?.value || '',
          contractTypeName: assignment.contractType?.value || '',
          effectivePeriod: `${new Date(assignment.activeFrom).toLocaleDateString()} - ${new Date(assignment.activeTo).toLocaleDateString()}`,
          conflictStatus: 'NONE'
        }

        return enhanced
      })
    },
    []
  )

  // Calculate statistics
  const calculateStatistics = useCallback(
    (assignmentsData: ExpenseRuleAssignment[], rulesData: ExpenseRule[]): ExpenseSettingsStatistics => {
      const now = new Date()
      const activeAssignments = assignmentsData.filter(
        a => new Date(a.activeFrom) <= now && new Date(a.activeTo) >= now
      )

      const standardRules = rulesData.filter(r => r.standard === true)
      const customRules = rulesData.filter(r => r.standard === false || r.standard === null || r.standard === undefined)

      // TODO: Add mileage and region rules counts when we have that data
      const recentChanges = assignmentsData.filter(a => {
        const created = new Date(a.activeFrom)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return created >= weekAgo
      })

      return {
        totalRules: rulesData.length,
        activeAssignments: activeAssignments.length,
        standardRules: standardRules.length,
        customRules: customRules.length,
        mileageRules: 0, // TODO: Implement when mileage data is available
        regionRules: 0, // TODO: Implement when region data is available
        recentChanges: recentChanges.length,
        conflictingRules: 0 // TODO: Implement conflict detection
      }
    },
    []
  )

  // Load all data
  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch data in parallel
      const [assignmentsResponse, rulesResponse] = await Promise.all([
        fetchExpenseRuleAssignments({ limit: 100 }),
        fetchExpenseRules({ limit: 100 })
      ])

      // Transform and set assignments
      const enhancedAssignments = transformAssignments(assignmentsResponse.ExpenseRuleAssignment || [])
      setAssignments(enhancedAssignments)

      // Set rules
      setRules(rulesResponse.ExpenseRule || [])

      // Calculate and set statistics
      const stats = calculateStatistics(
        assignmentsResponse.ExpenseRuleAssignment || [],
        rulesResponse.ExpenseRule || []
      )
      setStatistics(stats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading expense settings data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchExpenseRuleAssignments, fetchExpenseRules, transformAssignments, calculateStatistics])

  // Search assignments
  const searchAssignments = useCallback(
    async (params: {
      search?: string
      filters?: ExpenseRuleAssignmentFilters
      orderBy?: any[]
      limit?: number
      offset?: number
    }) => {
      if (!context.accessToken) {
        setIsAssignmentsLoading(false)
        return
      }

      setIsAssignmentsLoading(true)
      setError(null)

      try {
        const response = await fetchExpenseRuleAssignments({
          search: params.search,
          filters: params.filters,
          orderBy: params.orderBy,
          limit: params.limit || 20,
          offset: params.offset || 0
        })

        const enhancedAssignments = transformAssignments(response.ExpenseRuleAssignment || [])
        setAssignments(enhancedAssignments)
        setTotalAssignments(response.ExpenseRuleAssignmentAggregate?.aggregate?.count || 0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        console.error('Error searching assignments:', err)
      } finally {
        setIsAssignmentsLoading(false)
      }
    },
    [context.accessToken, fetchExpenseRuleAssignments, transformAssignments]
  )

  // Search rules
  const searchRules = useCallback(
    async (params: { search?: string }) => {
      if (!context.accessToken) {
        setIsRulesLoading(false)
        return
      }

      setIsRulesLoading(true)
      setError(null)

      try {
        const response = await fetchExpenseRules({
          search: params.search,
          limit: 100
        })

        setRules(response.ExpenseRule || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        console.error('Error searching rules:', err)
      } finally {
        setIsRulesLoading(false)
      }
    },
    [context.accessToken, fetchExpenseRules]
  )

  // CRUD Operations
  const createAssignment = useCallback(
    async (data: SaveExpenseRuleAssignmentInput) => {
      try {
        const result = await expenseSettingsClient.saveExpenseRuleAssignment(data)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error creating assignment:', error)
        throw error
      }
    },
    [loadData]
  )

  const updateAssignment = useCallback(
    async (id: string, data: SaveExpenseRuleAssignmentInput) => {
      try {
        // Include id in the data for update operation
        const updateData = {
          ...data,
          expenseRuleAssignment: {
            ...data.expenseRuleAssignment,
            id
          }
        }
        const result = await expenseSettingsClient.saveExpenseRuleAssignment(updateData)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error updating assignment:', error)
        throw error
      }
    },
    [loadData]
  )

  const deleteAssignment = useCallback(
    async (id: string) => {
      try {
        const result = await expenseSettingsClient.deleteExpenseRuleAssignment(id)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error deleting assignment:', error)
        throw error
      }
    },
    [loadData]
  )

  // Mileage rule operations
  const createMileageRule = useCallback(
    async (data: MileageRuleFormData) => {
      try {
        const result = await expenseSettingsClient.saveMileageRule(data)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error creating mileage rule:', error)
        throw error
      }
    },
    [loadData]
  )

  const updateMileageRule = useCallback(
    async (id: string, data: MileageRuleFormData, version?: number) => {
      try {
        // Include id and version in the data for update operation
        const updateData = {
          ...data,
          id,
          ...(version !== undefined && { version })
        }
        const result = await expenseSettingsClient.saveMileageRule(updateData)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error updating mileage rule:', error)
        throw error
      }
    },
    [loadData]
  )

  const deleteMileageRule = useCallback(
    async (id: string) => {
      try {
        const result = await expenseSettingsClient.deleteMileageRule(id)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error deleting mileage rule:', error)
        throw error
      }
    },
    [loadData]
  )

  // Travel region rule operations
  const createTravelRegionRule = useCallback(
    async (data: AllowanceRegionRuleFormData) => {
      try {
        const result = await expenseSettingsClient.saveAllowanceRegionRule(data)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error creating travel region rule:', error)
        throw error
      }
    },
    [loadData]
  )

  const updateTravelRegionRule = useCallback(
    async (id: string, data: AllowanceRegionRuleFormData, version?: number) => {
      try {
        // Include id and version in the data for update operation
        const updateData = {
          ...data,
          id,
          ...(version !== undefined && { version })
        }
        const result = await expenseSettingsClient.saveAllowanceRegionRule(updateData)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error updating travel region rule:', error)
        throw error
      }
    },
    [loadData]
  )

  const deleteTravelRegionRule = useCallback(
    async (id: string) => {
      try {
        const result = await expenseSettingsClient.deleteAllowanceRegionRule(id)
        await loadData() // Refresh data
        return result
      } catch (error) {
        console.error('Error deleting travel region rule:', error)
        throw error
      }
    },
    [loadData]
  )

  // Validation
  const validateAssignment = useCallback(
    async (data: SaveExpenseRuleAssignmentInput): Promise<RuleValidationResult> => {
      try {
        return await expenseSettingsClient.validateRuleAssignment(data)
      } catch (error) {
        console.error('Error validating assignment:', error)
        return {
          isValid: false,
          conflicts: [],
          warnings: ['Validation failed - please check your input']
        }
      }
    },
    []
  )

  // Initial data load - skip if specified (for lazy loading)
  useEffect(() => {
    if (context.accessToken && !skipInitialLoad) {
      loadData()
    }
  }, [context.accessToken, loadData, skipInitialLoad])

  return {
    // Data
    assignments,
    totalAssignments,
    rules,
    statistics,

    // Loading states
    isLoading,
    isAssignmentsLoading,
    isRulesLoading,
    isStatisticsLoading,

    // Error state
    error,

    // CRUD operations
    createAssignment,
    updateAssignment,
    deleteAssignment,

    // Mileage rules
    createMileageRule,
    updateMileageRule,
    deleteMileageRule,

    // Travel region rules
    createTravelRegionRule,
    updateTravelRegionRule,
    deleteTravelRegionRule,

    // Validation
    validateAssignment,

    // Utility functions
    refetch: loadData,
    searchAssignments,
    searchRules
  }
}
