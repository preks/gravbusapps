import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_BENEFITS_FOR_CATALOG,
  GET_EMPLOYEE_REGION_ID,
  GET_REGION_COUNTRY_ID,
  GET_BENEFIT_TYPES_FOR_COUNTRY_WITH_TRANSLATIONS,
  GET_BENEFIT_TYPES_WITH_TRANSLATIONS,
  GET_BENEFIT_TYPES_WITH_TRANSLATIONS_EXCLUDE_HR_BACKOFFICE
} from '../queries/benefitCatalogQueries'
import { BENEFIT_TYPE_CATALOG, BENEFIT_TYPE_VERSION } from '../constants/benefitCatalogConstants'
import {
  BenefitCatalogItem,
  BenefitsCatalogData,
  CatalogBenefitEntry,
  GraphQLBenefitTypesResponse,
  GraphQLEmployeeBenefitsResponse,
  GraphQLCatalogEntry,
  GraphQLEmployeeBenefitResponse
} from '../types/benefitCatalogTypes'
import { EmployeeBenefit, CatalogEntry } from '../types/compensationTypes'
import { BenefitStatus, isBenefitActive, isBenefitScheduledForStart } from '../types/compensationEnums'

/**
 * Custom hook to fetch and manage benefits catalog
 *
 * ✅ FEATURES:
 * - Fetches all available benefit types from BenefitType catalog via GraphQL (with translations)
 * - Fetches benefit providers as child entries via GraphQL (with translations)
 * - Fetches employee's current benefits (active/inactive) via GraphQL
 * - Merges data to show which benefits are available vs assigned
 * - Provides action capabilities (request/deactivate)
 *
 * ✅ API INTEGRATION:
 * - Catalog data: Uses GraphQL for BenefitType catalog entries (includes translations)
 * - Employee data: Uses GraphQL for EmployeeBenefit table
 *
 * @param employeeId - The employee ID
 * @param accessToken - Access token for API authentication
 */
export const useBenefitsCatalog = (
  employeeId: string,
  accessToken: string,
  options?: { excludeHrBackoffice?: boolean }
) => {
  const [catalogData, setCatalogData] = useState<BenefitsCatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  /**
   * Resolve employee employment region's country id (Country catalog entry id).
   * Flow:
   * 1) Get employee workingCondition.region.id
   * 2) Resolve region CatalogEntry.additionalValue3 (countryId)
   */
  const getEmployeeCountryId = useCallback(async (): Promise<string | null> => {
    try {
      const regionRes = await graphqlClient.request<any>(GET_EMPLOYEE_REGION_ID, { employeeId })
      const regionId: string | undefined = regionRes?.Employee?.[0]?.workingCondition?.[0]?.region?.id || undefined
      if (!regionId) return null

      const countryRes = await graphqlClient.request<any>(GET_REGION_COUNTRY_ID, { regionId })
      const countryId: string | undefined = countryRes?.CatalogEntry?.[0]?.additionalValue3 || undefined
      return countryId || null
    } catch {
      return null
    }
  }, [employeeId, graphqlClient])

  /**
   * Transform GraphQL employee benefit response to EmployeeBenefit interface
   */
  const transformEmployeeBenefit = useCallback((graphqlBenefit: GraphQLEmployeeBenefitResponse): EmployeeBenefit => {
    return {
      id: graphqlBenefit.id,
      employeeId: graphqlBenefit.employeeId,
      benefitType: graphqlBenefit.benefitType as CatalogEntry,
      benefitTypeRef: graphqlBenefit.benefitTypeRef,
      benefitProvider: graphqlBenefit.benefitProvider as CatalogEntry,
      benefitProviderRef: graphqlBenefit.benefitProviderRef,
      yearlyAmount: graphqlBenefit.yearlyAmount ?? 0,
      monthlyAmount: graphqlBenefit.monthlyAmount ?? 0,
      employeeYearlyContribution: graphqlBenefit.employeeYearlyContribution ?? 0,
      employeeMonthlyContribution: graphqlBenefit.employeeMonthlyContribution ?? 0,
      currency: graphqlBenefit.currency as CatalogEntry,
      currencyRef: graphqlBenefit.currencyRef,
      startDate: graphqlBenefit.startDate ?? '',
      endDate: graphqlBenefit.endDate ?? null,
      status: graphqlBenefit.status ?? '',
      benefitStatus: graphqlBenefit.benefitStatus ?? '',
      notes: graphqlBenefit.notes ?? '',
      createdAt: graphqlBenefit.createdAt,
      updatedAt: graphqlBenefit.updatedAt
    }
  }, [])

  /**
   * Merge catalog benefits with employee benefits
   * Creates an array showing all available benefits with status indicators
   */
  const mergeBenefitData = useCallback(
    (catalogEntries: CatalogBenefitEntry[], employeeBenefits: EmployeeBenefit[]): BenefitCatalogItem[] => {
      return catalogEntries.map(catalogEntry => {
        // Find ALL employee benefits for this benefit type (there can be multiple due to history)
        const matchingBenefits = employeeBenefits.filter(eb => eb.benefitTypeRef === catalogEntry.id)

        // Prioritize active benefits, then sort by creation date (most recent first)
        const sortedBenefits = [...matchingBenefits].sort((a, b) => {
          // Active benefits come first
          const aActive = isBenefitActive(a)
          const bActive = isBenefitActive(b)
          if (aActive && !bActive) return -1
          if (!aActive && bActive) return 1

          // If both have same active status, sort by creation date (newest first)
          const aDate = new Date(a.createdAt || 0).getTime()
          const bDate = new Date(b.createdAt || 0).getTime()
          return bDate - aDate
        })

        // Use the first one from sorted list (most recent active, or most recent if none active)
        const employeeBenefit = sortedBenefits[0]

        // Check if benefit is active (includes date validation)
        const isActive = employeeBenefit ? isBenefitActive(employeeBenefit) : false

        // Check if benefit is scheduled to start in the future (approved but not started yet)
        const isScheduled = employeeBenefit ? isBenefitScheduledForStart(employeeBenefit) : false

        // Determine action capabilities
        // CRITICAL FIX: Cannot request if benefit is active OR scheduled
        const canRequest = !isActive && !isScheduled
        const canDeactivate = isActive // Can deactivate if currently active

        // Store catalog entry with translations for runtime translation
        const catalogItem: BenefitCatalogItem = {
          // Catalog data
          catalogId: catalogEntry.id,
          benefitType: catalogEntry.value, // Default value (for backward compatibility)
          code: catalogEntry.code,
          description: catalogEntry.description || '',
          displayOrder: catalogEntry.displayOrder,
          parentEntryId: catalogEntry.parentEntryId,
          availableProviders: catalogEntry.childEntries || [], // Available providers for this benefit type
          catalogEntry: catalogEntry, // Store full entry with translations for runtime translation
          type: catalogEntry.type,

          // Employee benefit data (if exists)
          isActive,
          isScheduled, // NEW: Indicates benefit is approved and scheduled for future start
          employeeBenefitId: employeeBenefit?.id,
          provider: employeeBenefit?.benefitProvider,
          providerRef: employeeBenefit?.benefitProviderRef,
          yearlyAmount: employeeBenefit?.yearlyAmount,
          monthlyAmount: employeeBenefit?.monthlyAmount,
          currency: employeeBenefit?.currency,
          currencyRef: employeeBenefit?.currencyRef,
          startDate: employeeBenefit?.startDate ?? undefined,
          endDate: employeeBenefit?.endDate ?? undefined,
          notes: employeeBenefit?.notes ?? undefined,
          benefitStatus: employeeBenefit?.benefitStatus as BenefitStatus,

          // Action capabilities
          canRequest,
          canDeactivate,
          isPending: false // Note: Pending status will be available when approval workflows are implemented
        }

        return catalogItem
      })
    },
    []
  )

  /**
   * Fetch benefits catalog and employee benefits
   * Uses GraphQL for both catalog entries (with translations) and employee-specific data
   */
  const fetchBenefitsCatalog = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Start fetching employee-specific benefits immediately
      const employeeBenefitsPromise = graphqlClient.request<GraphQLEmployeeBenefitsResponse>(
        GET_EMPLOYEE_BENEFITS_FOR_CATALOG,
        { employeeId }
      )

      // Resolve employee country from employment region
      const countryId = await getEmployeeCountryId()

      // Choose catalog query: prefer country-filtered when available
      const catalogQuery =
        countryId != null
          ? GET_BENEFIT_TYPES_FOR_COUNTRY_WITH_TRANSLATIONS
          : options?.excludeHrBackoffice
            ? GET_BENEFIT_TYPES_WITH_TRANSLATIONS_EXCLUDE_HR_BACKOFFICE
            : GET_BENEFIT_TYPES_WITH_TRANSLATIONS

      const catalogVariables =
        countryId != null
          ? {
              catalogIdentifier: BENEFIT_TYPE_CATALOG,
              catalogVersion: BENEFIT_TYPE_VERSION,
              countryId
            }
          : {
              catalogIdentifier: BENEFIT_TYPE_CATALOG,
              catalogVersion: BENEFIT_TYPE_VERSION
            }

      // Fetch catalog entries (filtered by country when available) in parallel with employee benefits
      const [catalogResult, employeeResult] = await Promise.all([
        graphqlClient.request<GraphQLBenefitTypesResponse>(catalogQuery, catalogVariables),
        employeeBenefitsPromise
      ])

      // Transform GraphQL catalog response to match expected structure
      // GraphQL includes translations in the response via CATALOG_ENTRY_REF fragment
      const catalogEntries: CatalogBenefitEntry[] =
        catalogResult.CatalogEntry?.map((entry: GraphQLCatalogEntry) => ({
          id: entry.id,
          value: entry.value,
          code: entry.code,
          description: entry.description,
          displayOrder: entry.displayOrder || 0,
          parentEntryId: entry.parentEntryId,
          type: entry.type,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          // Prefer translation.objectValue when present, fallback to entry.objectValue
          objectValue:
            entry.objectValue ?? (entry.translations || []).find((tr: any) => tr?.objectValue != null)?.objectValue,
          translations: entry.translations || [], // GraphQL includes translations
          childEntries: (entry.childEntries || []).map((child: GraphQLCatalogEntry) => ({
            id: child.id,
            value: child.value,
            code: child.code,
            description: child.description,
            parentEntryId: child.parentEntryId,
            translations: child.translations || [] // GraphQL includes provider translations
          }))
        })) || []

      // Transform GraphQL employee benefits response to EmployeeBenefit interface
      const employeeBenefits: EmployeeBenefit[] = employeeResult?.EmployeeBenefit?.map(transformEmployeeBenefit) || []

      /**
       * Dynamically filter out parent/group entries.
       * A parent/group entry is one whose childEntries contain other benefit entries
       * (i.e., at least one child id matches a top-level benefit id). Leaf benefit
       * entries may still have provider children, whose ids won't match top-level
       * benefit ids, so they will be kept.
       */
      const topLevelIds = new Set((catalogEntries || []).map(entry => entry.id))
      const isParentGroup = (entry: CatalogBenefitEntry): boolean => {
        const children = entry.childEntries || []
        return children.some(child => topLevelIds.has(child.id))
      }
      const filteredCatalogEntries = (catalogEntries || []).filter(entry => !isParentGroup(entry))

      // Merge data using filtered catalog entries
      const mergedBenefits = mergeBenefitData(filteredCatalogEntries, employeeBenefits)

      // Calculate statistics
      const activeBenefitsCount = mergedBenefits.filter(b => b.isActive).length
      const totalBenefitsCount = mergedBenefits.length
      const availableBenefitsCount = totalBenefitsCount - activeBenefitsCount

      setCatalogData({
        catalogBenefits: mergedBenefits,
        activeBenefitsCount,
        availableBenefitsCount,
        totalBenefitsCount
      })
    } catch (err) {
      console.error('Error fetching benefits catalog:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch benefits catalog')
      setCatalogData(null)
    } finally {
      setLoading(false)
    }
  }, [
    employeeId,
    accessToken,
    graphqlClient,
    mergeBenefitData,
    transformEmployeeBenefit,
    getEmployeeCountryId,
    options?.excludeHrBackoffice
  ])

  useEffect(() => {
    fetchBenefitsCatalog()
  }, [fetchBenefitsCatalog])

  return {
    catalogData,
    loading,
    error,
    refetch: fetchBenefitsCatalog
  }
}
