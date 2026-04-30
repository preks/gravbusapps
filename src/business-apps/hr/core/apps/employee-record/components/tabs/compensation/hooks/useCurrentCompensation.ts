import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  GET_COMPENSATION_BAND_POLICY_FOR_EMPLOYEE,
  GET_EMPLOYEE_COMPENSATION_DATA
} from '../queries/compensationQueries'
import {
  CompensationData,
  EmployeeBonus,
  EmployeeBenefit,
  EmployeeSalary,
  EmployeeSalaryResponse
} from '../types/compensationTypes'
import { isCompensationStatusActive, isBenefitActive } from '../types/compensationEnums'
import {
  transformCompensationBand,
  transformEmployeeSalaryToCompensation,
  transformBonus,
  transformBenefit
} from '../utils/compensationTransformers'

interface SiteLocationResult {
  id: string
  geo_zone?: string | null
}

type SiteLocationResponse = SiteLocationResult[] | { data?: SiteLocationResult[] }

interface ActiveStructureResponse {
  structure?: { structureId?: string }
}

function formatGraphQLDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function extractSiteLocations(response: SiteLocationResponse): SiteLocationResult[] {
  if (Array.isArray(response)) {
    return response
  }
  return response.data ?? []
}

async function resolveActiveStructureId(
  orgchartClient: ReturnType<typeof useOrgchartClient>,
  accessToken: string
): Promise<string | null> {
  const activeStructureId = getCurrentActiveStructureId()
  if (activeStructureId) {
    return activeStructureId
  }

  return orgchartClient
    .getStructuresActive<ActiveStructureResponse>(
      { nodeType: 'cost_center', isPlanningMode: false },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    .then(response => response.structure?.structureId ?? null)
    .catch(() => null)
}

async function resolveGeoZoneId(
  orgchartClient: ReturnType<typeof useOrgchartClient>,
  accessToken: string,
  siteLocationId: string | null | undefined
): Promise<string | null> {
  if (!siteLocationId) {
    return null
  }

  const structureId = await resolveActiveStructureId(orgchartClient, accessToken)
  if (!structureId) {
    return siteLocationId
  }

  return orgchartClient
    .getSiteLocations<SiteLocationResponse>(
      { structureId, limit: 1000, offset: 0 },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    .then(response => {
      const siteLocation = extractSiteLocations(response).find(location => location.id === siteLocationId)
      return siteLocation?.geo_zone?.trim() || siteLocationId
    })
    .catch(() => siteLocationId)
}

function getJobFamilyId(
  employeePosition: EmployeeSalaryResponse['EmployeePosition'][number] | undefined
): string | null {
  return (
    employeePosition?.jobPosition?.jobFunction?.jobFamily?.id?.trim() ||
    employeePosition?.jobPosition?.jobProfile?.jobFunction?.jobFamily?.id?.trim() ||
    null
  )
}

/**
 * Hook to fetch and manage current employee compensation data
 *
 * Fetches:
 * - Current salary from EmployeeSalary (APPROVED active salary based on startDate/endDate)
 * - Compensation band from CompensationBand via EmployeePosition
 * - Current year bonuses from EmployeeBonus
 * - Active benefits from EmployeeBenefit
 *
 * Salary selection logic (HYBRID - Server + Client):
 *
 * SERVER-SIDE (GraphQL query):
 * 1. Filters by requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * 2. Filters out deleted records (isDeleted = false)
 * 3. Filters by startDate <= today (salary has started)
 * 4. Orders by startDate DESC (most recent first)
 * 5. Returns up to 5 records for client-side filtering
 *
 * CLIENT-SIDE (this hook):
 * 6. Finds first salary where: startDate <= today AND (endDate IS NULL OR endDate >= today)
 * 7. Returns null if no active salary found (UI shows "No active salary configured")
 *
 * Why hybrid?
 * - GraphQL doesn't handle null comparison properly with _not operator
 * - Client-side filtering ensures 100% accuracy for null endDate values
 * - Limit: 5 keeps it efficient while covering edge cases
 *
 * @param employeeId - The employee ID to fetch data for
 * @param accessToken - Access token for API authentication
 */
export const useCurrentCompensation = (employeeId: string, accessToken: string) => {
  const [data, setData] = useState<CompensationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)

  const fetchData = useCallback(async () => {
    // Early validation - skip silently if no employeeId or accessToken
    // This prevents showing error messages during initial load when parent hasn't provided data yet
    if (!employeeId || !accessToken) {
      setLoading(false)
      setError(null) // Clear any previous errors
      setData(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get today's date in GraphQL date format (YYYY-MM-DD) for server-side filtering.
      const today = formatGraphQLDate(new Date())

      // Fetch current compensation data from GraphQL
      // Server-side filtering: APPROVED + started salaries (up to 5 records)
      const result = await graphqlClient.request<EmployeeSalaryResponse>(GET_EMPLOYEE_COMPENSATION_DATA, {
        employeeId,
        today
      })

      // Validate response
      if (!result) {
        throw new Error('No data received from server')
      }

      // Get employee salaries from EmployeeSalary table
      // Query returned up to 5 most recent approved salaries (server-filtered by startDate <= today)
      const allEmployeeSalaries: EmployeeSalary[] = result?.AllEmployeeSalaries || []

      // CLIENT-SIDE FILTERING: Find truly active salary
      // Server already filtered startDate <= today, now just check endDate
      // Logic: endDate IS NULL OR endDate >= today (using string comparison for dates)
      const activeSalary = allEmployeeSalaries.find(salary => {
        // Server guarantees startDate <= today, so we only need to check endDate
        // Use string comparison to avoid timezone issues (YYYY-MM-DD format)
        const isNotExpired = !salary.endDate || salary.endDate >= today

        return isNotExpired
      })

      // Use active salary, or null if no active salary found
      const employeeSalary: EmployeeSalary | null = activeSalary || null

      // Extract and transform compensation band
      const employeePosition = result?.EmployeePosition?.[0]
      let compensationBandData: any = null

      const jobFamilyId = getJobFamilyId(employeePosition)
      const jobLevelId = employeePosition?.jobPosition?.jobLevel?.id?.trim() || null
      const geoZoneId = await resolveGeoZoneId(orgchartClient, accessToken, employeePosition?.siteLocationId)

      if (jobFamilyId && jobLevelId && geoZoneId) {
        const compensationBandResult = await graphqlClient
          .request<{ CompensationBandPolicy?: Array<{ compensationBand: any | null }> }>(
            GET_COMPENSATION_BAND_POLICY_FOR_EMPLOYEE,
            {
              jobFamilyId,
              jobLevelId,
              geoZoneId
            }
          )
          .catch((error: unknown) => {
            console.warn('[useCurrentCompensation] Compensation band policy lookup failed.', error)
            return null
          })

        compensationBandData = compensationBandResult?.CompensationBandPolicy?.[0]?.compensationBand || null
      }
      const compensationBand = transformCompensationBand(compensationBandData)

      // Transform employee salary to current compensation
      const currentCompensation = transformEmployeeSalaryToCompensation(employeeSalary, compensationBand)

      // Transform bonuses
      const bonuses = (result?.EmployeeBonus || []).map(transformBonus)

      // Transform benefits
      const benefits = (result?.EmployeeBenefit || []).map(transformBenefit)

      // Calculate total bonuses for current year (YTD)
      const currentYear = new Date().getFullYear()
      const activeBonuses = bonuses.filter((bonus: EmployeeBonus) => {
        const bonusYear = new Date(bonus.paymentDate).getFullYear()
        return bonusYear === currentYear && isCompensationStatusActive(bonus.status)
      })
      const totalBonusesYTD = activeBonuses.reduce((sum: number, bonus: EmployeeBonus) => sum + bonus.amount, 0)
      const activeBonusesCount = activeBonuses.length

      // Count active benefits - deduplicate by benefitTypeRef to match catalog display
      // Group benefits by type and keep only the most recent active one per type
      const benefitsByType = benefits.reduce(
        (acc, benefit) => {
          const typeRef = benefit.benefitTypeRef
          if (!acc[typeRef]) {
            acc[typeRef] = []
          }
          acc[typeRef].push(benefit)
          return acc
        },
        {} as Record<string, EmployeeBenefit[]>
      )

      const uniqueActiveBenefits = Object.values(benefitsByType).map(typeBenefits => {
        // Sort by: active first, then by creation date (newest first)
        // Creating a copy with spread operator before sorting to avoid mutating typeBenefits
        const sorted = [...typeBenefits].sort((a, b) => {
          const aActive = isBenefitActive(a)
          const bActive = isBenefitActive(b)
          if (aActive && !bActive) return -1
          if (!aActive && bActive) return 1

          const aDate = new Date(a.createdAt || 0).getTime()
          const bDate = new Date(b.createdAt || 0).getTime()
          return bDate - aDate
        })
        return sorted[0]
      })

      const activeBenefitsCount = uniqueActiveBenefits.filter((benefit: EmployeeBenefit) =>
        isBenefitActive(benefit)
      ).length

      // Set the data
      setData({
        currentCompensation,
        totalBonusesYTD,
        activeBonusesCount,
        activeBenefitsCount,
        bonuses,
        benefits
      })
    } catch (err) {
      console.error('Error fetching current compensation data:', err)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load current compensation data'

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('No data received')) {
          errorMessage = 'Unable to retrieve compensation data. Please try again later.'
        } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
          errorMessage = 'Your session has expired. Please refresh the page.'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, graphqlClient, orgchartClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
