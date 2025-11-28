import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_HEALTH_INSURANCE_DISTRIBUTION } from '../queries/getHealthInsuranceDistribution'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface HealthInsuranceItem {
  name: string
  count: number
  percentage: number
}

interface HealthInsuranceDistributionHookResult {
  distribution: HealthInsuranceItem[]
  loading: boolean
  error: Error | null
  totalEmployees: number
}

/**
 * Hook to fetch and process health insurance distribution data
 * Returns distribution data, loading state, and any error
 */
export const useHealthInsuranceDistribution = (accessToken: string): HealthInsuranceDistributionHookResult => {
  const [distribution, setDistribution] = useState<HealthInsuranceItem[]>([])
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

        const data = await graphQLClient.request(GET_HEALTH_INSURANCE_DISTRIBUTION)

        // Get total employee count
        const total = data.EmployeePositionAggregate.aggregate.count
        setTotalEmployees(total)

        // Process the raw data to count occurrences of each healthInsuranceName
        const healthInsuranceCounts: Record<string, number> = {}

        // Log the response for debugging
        console.log('[useHealthInsuranceDistribution] GraphQL response:', data)

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
        data.Employee.forEach((employee: { id: string; taxDetails?: { healthInsuranceName: string | null }[] }) => {
          let healthInsuranceRef = null

          // Check if employee has tax details with a valid health insurance name
          if (employee.taxDetails && employee.taxDetails.length > 0 && employee.taxDetails[0]?.healthInsuranceName) {
            healthInsuranceRef = employee.taxDetails[0].healthInsuranceName
          }

          // Get human-readable value from catalog or use raw reference or translated 'Not Specified'
          let displayValue = t('hr-analytics-not-specified')
          if (healthInsuranceRef) {
            // If it's a catalog reference, extract the code and look up in our map
            if (healthInsuranceRef.startsWith('HealthInsurer:v1:')) {
              // Extract the code part from the reference
              const parts = healthInsuranceRef.split(':')
              const code = parts.length > 2 ? parts[2] : healthInsuranceRef

              // Look up the human-readable value from our map
              if (codeToValueMap[code]) {
                displayValue = codeToValueMap[code]
              } else {
                // If not found in catalog, use the code part as fallback
                displayValue = code
              }
            } else {
              // Otherwise use the raw value (might be a direct name like "Company XYZ")
              displayValue = healthInsuranceRef
            }
          }

          // Count this health insurance (with human-readable name)
          healthInsuranceCounts[displayValue] = (healthInsuranceCounts[displayValue] || 0) + 1
        })

        // Transform the counts into the required format
        const transformedData: HealthInsuranceItem[] = Object.entries(healthInsuranceCounts).map(([name, count]) => ({
          name,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))

        // Sort by count (descending)
        transformedData.sort((a, b) => b.count - a.count)

        setDistribution(transformedData)
      } catch (err) {
        console.error('[useHealthInsuranceDistribution] Error fetching health insurance data:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken, graphQLClient])

  return { distribution, loading, error, totalEmployees }
}
