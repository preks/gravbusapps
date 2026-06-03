import { useEffect, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { StructureCompany } from '../utils/fetchActiveStructureCompanies'

const GET_EMPLOYEE_DEFAULT_COMPANY_ID = `
  query GetEmployeeDefaultCompanyId($employeeId: uuid!) {
    EmployeePosition(where: { employeeId: { _eq: $employeeId } }, limit: 1) {
      companyId
    }
  }
`

/**
 * When the page loads with no company selected, sets the company dropdown to the
 * legal entity of the logged-in user's current EmployeePosition (if that company
 * exists in the active structure's company list).
 */
export function useDefaultCompanyForCurrentUser(
  accessToken: string | undefined,
  employeeId: string | undefined,
  companies: StructureCompany[],
  companiesLoading: boolean,
  selectedCompanyId: string | null,
  setSelectedCompanyId: (id: string | null) => void
): void {
  const graphqlClient = useGraphQLClient(accessToken ?? '')
  const hasAttemptedDefaultRef = useRef(false)

  // Allow default selection to run again after a failed/empty company list recovers (e.g. org chart load error).
  useEffect(() => {
    if (companies.length === 0) {
      hasAttemptedDefaultRef.current = false
    }
  }, [companies.length])

  useEffect(() => {
    if (!accessToken || !employeeId || companiesLoading || companies.length === 0) return
    if (selectedCompanyId != null) return
    if (hasAttemptedDefaultRef.current) return

    let cancelled = false

    ;(async () => {
      try {
        const result = await graphqlClient.request<{
          EmployeePosition: Array<{ companyId: string } | null>
        }>(GET_EMPLOYEE_DEFAULT_COMPANY_ID, { employeeId })
        if (cancelled) return
        const cid = result.EmployeePosition?.[0]?.companyId
        if (cid && companies.some(c => c.id === cid)) {
          setSelectedCompanyId(cid)
        }
      } catch {
        // User can still choose a company manually
      } finally {
        if (!cancelled) {
          hasAttemptedDefaultRef.current = true
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, employeeId, companies, companiesLoading, selectedCompanyId, setSelectedCompanyId, graphqlClient])
}
