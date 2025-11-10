import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { GET_EMPLOYEE_BENEFITS_FOR_CATALOG } from '../queries/benefitCatalogQueries'
import { BenefitCatalogItem, BenefitsCatalogData, CatalogBenefitEntry } from '../types/benefitCatalogTypes'
import { EmployeeBenefit } from '../types/compensationTypes'
import { BenefitStatus, isBenefitActive } from '../types/compensationEnums'

// Catalog identifiers
export const BENEFIT_TYPE_CATALOG = 'BenefitType'
export const BENEFIT_TYPE_VERSION = 'v1'
export const BENEFIT_PROVIDER_CATALOG = 'BenefitProvider'
export const BENEFIT_PROVIDER_VERSION = 'v1'

/**
 * Custom hook to fetch and manage benefits catalog
 *
 * ✅ FEATURES:
 * - Fetches all available benefit types from BenefitType catalog via Catalog Manager API
 * - Fetches benefit providers from BenefitProvider catalog via Catalog Manager API
 * - Fetches employee's current benefits (active/inactive) via GraphQL
 * - Merges data to show which benefits are available vs assigned
 * - Provides action capabilities (request/deactivate)
 *
 * ✅ API INTEGRATION:
 * - Catalog data: Uses useCatalogManagerClient for BenefitType and BenefitProvider
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
  const catalogClient = useCatalogManagerClient(accessToken)

  /**
   * Merge catalog benefits with employee benefits
   * Creates an array showing all available benefits with status indicators
   */
  const mergeBenefitData = useCallback(
    (catalogEntries: CatalogBenefitEntry[], employeeBenefits: EmployeeBenefit[]): BenefitCatalogItem[] => {
      return catalogEntries.map(catalogEntry => {
        // Find if employee has this benefit (check by benefitTypeRef matching catalog ID)
        const employeeBenefit = employeeBenefits.find(eb => eb.benefitTypeRef === catalogEntry.id)

        // Check if benefit is active
        const isActive = employeeBenefit ? isBenefitActive(employeeBenefit.benefitStatus) : false

        // Determine action capabilities
        const canRequest = !isActive // Can request if not currently active
        const canDeactivate = isActive // Can deactivate if currently active

        const catalogItem: BenefitCatalogItem = {
          // Catalog data
          catalogId: catalogEntry.id,
          benefitType: catalogEntry.value,
          code: catalogEntry.code,
          description: catalogEntry.description || '',
          displayOrder: catalogEntry.displayOrder,
          availableProviders: catalogEntry.childEntries || [], // Available providers for this benefit type

          // Employee benefit data (if exists)
          isActive,
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
   * Uses Catalog Manager API for BenefitType/Provider and GraphQL for employee-specific data
   */
  const fetchBenefitsCatalog = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch catalog benefits and employee benefits in parallel
      const [catalogResponse, employeeResult] = await Promise.all([
        // Use Catalog Manager API for BenefitType catalog with child providers
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: BENEFIT_TYPE_CATALOG,
            version: BENEFIT_TYPE_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true // Include BenefitProvider as child entries
          }
        ),
        // Use GraphQL for employee-specific benefits
        graphqlClient.request<{ EmployeeBenefit: EmployeeBenefit[] }>(GET_EMPLOYEE_BENEFITS_FOR_CATALOG, {
          employeeId
        })
      ])

      // Transform catalog response to match expected structure
      const catalogEntries: CatalogBenefitEntry[] =
        catalogResponse.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value,
          code: entry.code,
          description: entry.description,
          displayOrder: entry.displayOrder,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          childEntries: entry.childEntries || []
        })) || []

      const employeeBenefits = employeeResult?.EmployeeBenefit || []

      // Merge data
      const mergedBenefits = mergeBenefitData(catalogEntries, employeeBenefits)

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
  }, [employeeId, accessToken, catalogClient, graphqlClient, mergeBenefitData])

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
