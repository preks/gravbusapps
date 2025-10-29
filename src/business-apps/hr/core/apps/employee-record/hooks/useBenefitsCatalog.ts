import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_BENEFIT_CATALOG, GET_EMPLOYEE_BENEFITS_FOR_CATALOG } from '../queries/benefitCatalogQueries'
import { BenefitCatalogItem, BenefitsCatalogData, CatalogBenefitEntry } from '../types/benefitCatalogTypes'
import { EmployeeBenefit } from '../types/compensationTypes'
import { BenefitStatus, isBenefitActive } from '../types/compensationEnums'

/**
 * Custom hook to fetch and manage benefits catalog
 *
 * ✅ FEATURES:
 * - Fetches all available benefit types from BenefitType catalog
 * - Fetches employee's current benefits (active/inactive)
 * - Merges data to show which benefits are available vs assigned
 * - Provides action capabilities (request/deactivate)
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

          // Employee benefit data (if exists)
          isActive,
          employeeBenefitId: employeeBenefit?.id,
          provider: employeeBenefit?.benefitProvider,
          providerRef: employeeBenefit?.benefitProviderRef,
          yearlyAmount: employeeBenefit?.yearlyAmount,
          monthlyAmount: employeeBenefit?.monthlyAmount,
          currency: employeeBenefit?.currency,
          currencyRef: employeeBenefit?.currencyRef,
          startDate: employeeBenefit?.startDate,
          endDate: employeeBenefit?.endDate,
          notes: employeeBenefit?.notes,
          benefitStatus: employeeBenefit?.benefitStatus as BenefitStatus,

          // Action capabilities
          canRequest,
          canDeactivate,
          isPending: false // TODO: Implement pending status check
        }

        return catalogItem
      })
    },
    []
  )

  /**
   * Fetch benefits catalog and employee benefits
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
      const [catalogResult, employeeResult] = await Promise.all([
        graphqlClient.request<{ CatalogEntry: CatalogBenefitEntry[] }>(GET_BENEFIT_CATALOG),
        graphqlClient.request<{ EmployeeBenefit: EmployeeBenefit[] }>(GET_EMPLOYEE_BENEFITS_FOR_CATALOG, {
          employeeId
        })
      ])

      const catalogEntries = catalogResult?.CatalogEntry || []
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
  }, [employeeId, accessToken, graphqlClient, mergeBenefitData])

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
