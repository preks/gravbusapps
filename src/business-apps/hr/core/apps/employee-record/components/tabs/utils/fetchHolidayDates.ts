import { employeeRegionLookupQuery, employmentRegionHolidaysQuery } from '../../../queries/attendanceQueries'

// Minimal client contract compatible with useGraphQLClient()
type GraphqlClientLike = {
  request: <T = any>(query: string, variables?: Record<string, any>) => Promise<T>
}

/**
 * Fetch holiday dates for a specific employee's employment region and month.
 *
 * @param graphqlClient - initialized GraphQL client
 * @param employeeId - employee identifier
 * @param year - full year (e.g., 2025)
 * @param monthIndex - zero-based month (0=Jan .. 11=Dec)
 * @param locale - active user locale for translations
 * @returns array of date strings in format YYYY-MM-DD for the requested month
 */
export const fetchHolidayDates = async (
  graphqlClient: GraphqlClientLike,
  employeeId: string,
  year: number,
  monthIndex: number,
  locale: string
): Promise<string[]> => {
  try {
    // Resolve employee employment region
    const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
      employeeId,
      activeUserLocale: locale
    })
    const regionCodeRaw: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
    if (!regionCodeRaw) {
      return []
    }

    // Normalize Romania sub-regions (e.g., RO211 → ROU)
    let regionCode = regionCodeRaw
    try {
      const segment = String(regionCodeRaw).split(':').pop() || ''
      if (segment.startsWith('RO') && segment !== 'ROU') {
        regionCode = 'EmploymentRegion:v1:ROU'
      }
    } catch {}

    // Fetch holidays for region
    const holidaysRes = await graphqlClient.request<any>(employmentRegionHolidaysQuery, {
      activeUserLocale: locale,
      regionId: regionCode
    })
    const holidays: any[] = holidaysRes?.holidays || []

    const yearStr = String(year)
    const targetDates: string[] = holidays
      .filter(h => String(h?.additionalValue3 ?? '') === yearStr)
      .map(h => String(h?.alternativeCode ?? h?.code ?? ''))
      .map(code => {
        // Catalog date code format: YYYYMMDD
        const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
        if (!match) return null
        const y = parseInt(match[1], 10)
        const m = parseInt(match[2], 10) // 1-12
        const d = parseInt(match[3], 10)
        if (y !== year || m !== monthIndex + 1) return null
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        return dateStr
      })
      .filter(Boolean) as string[]

    return targetDates
  } catch {
    return []
  }
}
