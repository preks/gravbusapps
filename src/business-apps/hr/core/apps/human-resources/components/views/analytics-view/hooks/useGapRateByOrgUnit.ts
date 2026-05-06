import { useOrgUnitRateDataset } from './useOrgUnitRateDataset'

/**
 * Interface for organizational unit gap rate data
 */
export interface OrganizationalUnitGapRate {
  id: string
  name: string
  totalPositions: number
  vacantPositions: number
  gapRate: number // percentage of vacant positions
}

/**
 * Hook to fetch and calculate Gap Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing gap rate data by org unit, loading state, and error
 */
export function useGapRateByOrgUnit(accessToken: string) {
  const { data, loading, error } = useOrgUnitRateDataset<OrganizationalUnitGapRate>({
    accessToken,
    queryName: 'gapRateByOrgUnit',
    logPrefix: '[useGapRateByOrgUnit]',
    mapRow: (row, { roundToOneDecimal }) => ({
      id: String(row.category ?? ''),
      name: String(row.category ?? ''),
      totalPositions: 0,
      vacantPositions: 0,
      gapRate: roundToOneDecimal(Number(row?.value ?? 0))
    }),
    sort: (a, b) => b.gapRate - a.gapRate
  })

  return { data, loading, error }
}
