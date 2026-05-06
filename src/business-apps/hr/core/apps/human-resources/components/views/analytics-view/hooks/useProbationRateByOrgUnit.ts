import { useOrgUnitRateDataset } from './useOrgUnitRateDataset'

/**
 * Interface for organizational unit probation rate data
 */
export interface OrganizationalUnitProbationRate {
  id: string
  name: string
  totalEmployees: number
  employeesInProbation: number
  probationRate: number // percentage of employees in probation
}

/**
 * Hook to fetch and calculate Probation Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing probation rate data by org unit, loading state, and error
 */
export function useProbationRateByOrgUnit(accessToken: string) {
  const { data, loading, error } = useOrgUnitRateDataset<OrganizationalUnitProbationRate>({
    accessToken,
    queryName: 'probationRateByOrgUnit',
    logPrefix: '[useProbationRateByOrgUnit]',
    mapRow: (row, { roundToOneDecimal }) => ({
      id: String(row.category ?? ''),
      name: String(row.category ?? ''),
      totalEmployees: 0,
      employeesInProbation: 0,
      probationRate: roundToOneDecimal(Number(row?.value ?? 0))
    }),
    sort: (a, b) => b.probationRate - a.probationRate
  })

  return { data, loading, error }
}
