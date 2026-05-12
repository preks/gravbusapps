import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_BENEFITS_FOR_CATALOG,
  GET_EMPLOYEE_REGION_ID,
  GET_REGION_COUNTRY_ID,
  GET_BENEFIT_TYPES_FOR_COUNTRY_WITH_TRANSLATIONS
} from '../queries/benefitCatalogQueries'
import { BENEFIT_TYPE_CATALOG, BENEFIT_TYPE_VERSION } from '../constants/benefitCatalogConstants'
import {
  BenefitCatalogItem,
  BenefitsCatalogData,
  CatalogBenefitEntry,
  ProviderEntry,
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
export const useBenefitsCatalog = (employeeId: string, accessToken: string) => {
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
      const regionRes = await graphqlClient.request<any>(GET_EMPLOYEE_REGION_ID, {
        employeeId,
        today: new Date().toISOString()
      })
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
      comments: graphqlBenefit.comments ?? undefined,
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
        // Match by this entry's id or any merged catalog ids (same benefit type shown once)
        const typeIds = catalogEntry.catalogIds ?? [catalogEntry.id]
        const matchingBenefits = employeeBenefits.filter(eb => typeIds.includes(eb.benefitTypeRef))

        // Check if there's a pending request for this benefit type
        // Only count PENDING_COMPENSATION status (cancelled requests are naturally excluded)
        const isPending = matchingBenefits.some(benefit => benefit.status === 'PENDING_COMPENSATION')

        // Prioritize active benefits, then scheduled, then pending, then sort by creation date (most recent first)
        const sortedBenefits = [...matchingBenefits].sort((a, b) => {
          // Active benefits come first
          const aActive = isBenefitActive(a)
          const bActive = isBenefitActive(b)
          if (aActive && !bActive) return -1
          if (!aActive && bActive) return 1

          // Scheduled benefits come next
          const aScheduled = isBenefitScheduledForStart(a)
          const bScheduled = isBenefitScheduledForStart(b)
          if (aScheduled && !bScheduled) return -1
          if (!aScheduled && bScheduled) return 1

          // Pending benefits come next
          const aPending = a.status === 'PENDING_COMPENSATION'
          const bPending = b.status === 'PENDING_COMPENSATION'
          if (aPending && !bPending) return -1
          if (!aPending && bPending) return 1

          // If both have same status, sort by creation date (newest first)
          const aDate = new Date(a.createdAt || 0).getTime()
          const bDate = new Date(b.createdAt || 0).getTime()
          return bDate - aDate
        })

        // Use the first one from sorted list (most recent active, scheduled, pending, or historical)
        const employeeBenefit = sortedBenefits[0]

        // Check if this specific employee benefit instance is pending or cancelled
        // Note: This is different from the aggregated isPending which checks if ANY benefit of this type is pending
        const isEmployeeBenefitPending = employeeBenefit?.status === 'PENDING_COMPENSATION'
        const isEmployeeBenefitCancelled = employeeBenefit?.status === 'CANCELLED_COMPENSATION'

        // Check if benefit is active (includes date validation)
        // CRITICAL DISTINCTION:
        // - Pending ACTIVATION (benefitStatus != ACTIVE_BENEFIT): Should NOT be active - needs approval first
        // - Pending DEACTIVATION (benefitStatus = ACTIVE_BENEFIT + status = PENDING_COMPENSATION): SHOULD be active until deactivation is approved
        const isPendingActivation = isEmployeeBenefitPending && employeeBenefit?.benefitStatus !== BenefitStatus.ACTIVE

        const isActive =
          employeeBenefit && !isPendingActivation && !isEmployeeBenefitCancelled
            ? isBenefitActive(employeeBenefit)
            : false

        // Check if benefit is scheduled to start in the future (approved but not started yet)
        // CRITICAL: Pending activation and cancelled benefits should never be classified as scheduled - they need approval first
        // But pending deactivation benefits can still be scheduled if they have a future start date
        const isScheduled =
          employeeBenefit && !isPendingActivation && !isEmployeeBenefitCancelled
            ? isBenefitScheduledForStart(employeeBenefit)
            : false

        // Determine action capabilities
        // CRITICAL: Cannot request if benefit is active, scheduled, OR pending
        const canRequest = !isActive && !isScheduled && !isPending && !isEmployeeBenefitCancelled
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
          isCancelled: isEmployeeBenefitCancelled,
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
          comments: employeeBenefit?.comments ?? undefined,
          benefitStatus: employeeBenefit?.benefitStatus as BenefitStatus,

          // Action capabilities
          canRequest,
          canDeactivate,
          isPending // Detects if there's a pending request for this benefit type
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

      // When no employment region (no country), do not show any benefits — avoid showing full unfiltered catalog (e.g. all German + Romanian benefits)
      if (countryId == null) {
        setCatalogData({
          catalogBenefits: [],
          activeBenefitsCount: 0,
          scheduledBenefitsCount: 0,
          availableBenefitsCount: 0,
          totalBenefitsCount: 0
        })
        setLoading(false)
        return
      }

      // Catalog is always filtered by employee's country (from employment region)
      const catalogQuery = GET_BENEFIT_TYPES_FOR_COUNTRY_WITH_TRANSLATIONS
      const catalogVariables = {
        catalogIdentifier: BENEFIT_TYPE_CATALOG,
        catalogVersion: BENEFIT_TYPE_VERSION,
        countryId
      }

      // Fetch catalog entries (filtered by country) in parallel with employee benefits
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

      // Deduplicate by benefit type (code): show one card per type, merge providers from all catalog entries with same code
      const byCode = new Map<string, CatalogBenefitEntry[]>()
      for (const entry of filteredCatalogEntries) {
        const code = entry.code || entry.id
        if (!byCode.has(code)) byCode.set(code, [])
        byCode.get(code)!.push(entry)
      }
      const dedupedCatalogEntries: CatalogBenefitEntry[] = []
      for (const [, entries] of byCode) {
        const sorted = [...entries].sort((a, b) => a.displayOrder - b.displayOrder)
        const primary = sorted[0]
        const catalogIds = sorted.map(e => e.id)
        const providerById = new Map<string, ProviderEntry>()
        for (const e of sorted) {
          for (const child of e.childEntries || []) {
            providerById.set(child.id, child)
          }
        }
        dedupedCatalogEntries.push({
          ...primary,
          id: primary.id,
          catalogIds: catalogIds.length > 1 ? catalogIds : undefined,
          childEntries: Array.from(providerById.values())
        })
      }
      dedupedCatalogEntries.sort((a, b) => a.displayOrder - b.displayOrder)

      // Merge data using deduplicated catalog entries (one per benefit type)
      const mergedBenefits = mergeBenefitData(dedupedCatalogEntries, employeeBenefits)

      // Calculate statistics
      const activeBenefitsCount = mergedBenefits.filter(b => b.isActive).length
      const scheduledBenefitsCount = mergedBenefits.filter(b => b.isScheduled).length
      const totalBenefitsCount = mergedBenefits.length
      const availableBenefitsCount = totalBenefitsCount - activeBenefitsCount - scheduledBenefitsCount

      setCatalogData({
        catalogBenefits: mergedBenefits,
        activeBenefitsCount,
        scheduledBenefitsCount,
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
  }, [employeeId, accessToken, graphqlClient, mergeBenefitData, transformEmployeeBenefit, getEmployeeCountryId])

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
