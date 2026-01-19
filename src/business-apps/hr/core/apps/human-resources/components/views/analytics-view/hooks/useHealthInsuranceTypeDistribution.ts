import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_HEALTH_INSURANCE_TYPE_DISTRIBUTION } from '../queries/getHealthInsuranceTypeDistribution'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface HealthInsuranceTypeItem {
  name: string
  count: number
  percentage: number
}

/**
 * Hook to fetch and process health insurance type distribution data
 * @param accessToken - Access token for API authentication
 * @returns Object containing the distribution data, loading state, error, and total employee count
 */
export const useHealthInsuranceTypeDistribution = (accessToken: string) => {
  const [distribution, setDistribution] = useState<HealthInsuranceTypeItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalEmployees, setTotalEmployees] = useState<number>(0)
  const { t } = useTranslation(hrTranslations)

  const graphQLClient = useGraphqlClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await graphQLClient.request(GET_HEALTH_INSURANCE_TYPE_DISTRIBUTION)

        // Get total employee count
        const total = data.EmployeePositionAggregate.aggregate.count
        setTotalEmployees(total)

        // Process the raw data to count occurrences of each healthInsuranceTypeRef
        const healthInsuranceTypeCounts: Record<string, number> = {}

        // Log the response for debugging
        console.log('[useHealthInsuranceTypeDistribution] GraphQL response:', data)

        // Create a map of code to human-readable value from catalog entries
        const userLocale = getCurrentActiveUserLocale() || 'en'
        const codeToValueMap: Record<string, string> = {}

        // Process catalog entries
        if (data.CatalogEntry && Array.isArray(data.CatalogEntry)) {
          data.CatalogEntry.forEach(
            (entry: {
              id: string
              code: string
              value: string
              translations: { localeCode: string; value: string }[]
            }) => {
              // First try to find a translation matching user's locale
              const userLocaleTranslation = entry.translations.find(t => t.localeCode === userLocale)
              if (userLocaleTranslation) {
                codeToValueMap[entry.code] = userLocaleTranslation.value
                return
              }

              // Fall back to English translation
              const englishTranslation = entry.translations.find(t => t.localeCode === 'en')
              if (englishTranslation) {
                codeToValueMap[entry.code] = englishTranslation.value
                return
              }

              // Fall back to any translation
              if (entry.translations.length > 0) {
                codeToValueMap[entry.code] = entry.translations[0].value
                return
              }

              // Last resort: use the entry's value field
              codeToValueMap[entry.code] = entry.value || entry.code
            }
          )
        }

        // Process employees and their tax details
        data.Employee.forEach((employee: { id: string; taxDetails?: { healthInsuranceTypeRef: string | null }[] }) => {
          let healthInsuranceTypeRef = null

          // Check if employee has tax details with a valid health insurance type
          if (employee.taxDetails && employee.taxDetails.length > 0 && employee.taxDetails[0]?.healthInsuranceTypeRef) {
            healthInsuranceTypeRef = employee.taxDetails[0].healthInsuranceTypeRef
          }

          // Get human-readable value from catalog or translated 'Not Specified'
          let displayValue = t('hr-analytics-not-specified')
          if (healthInsuranceTypeRef) {
            // Extract the code part from the reference (e.g., "STATUTORILY" from "HealthInsuranceType:v1:STATUTORILY")
            const parts = healthInsuranceTypeRef.split(':')
            const code = parts.length > 2 ? parts[2] : healthInsuranceTypeRef

            // Look up the human-readable value from our map
            if (codeToValueMap[code]) {
              displayValue = codeToValueMap[code]
            } else {
              // If not found in catalog, use the code part as fallback
              displayValue = code
            }
          }

          // Count this health insurance type with its display value
          healthInsuranceTypeCounts[displayValue] = (healthInsuranceTypeCounts[displayValue] || 0) + 1
        })

        // Transform the counts into the required format
        const transformedData = Object.entries(healthInsuranceTypeCounts).map(([name, count]) => ({
          name,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))

        // Sort by count (descending)
        transformedData.sort((a, b) => b.count - a.count)

        setDistribution(transformedData)
      } catch (err) {
        console.error('[useHealthInsuranceTypeDistribution] Error fetching health insurance type data:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken, graphQLClient])

  return {
    distribution,
    loading,
    error,
    totalEmployees
  }
}
