import {
  isServerAuthoritativeRepairReapply,
  subtractAuthoritativeRepairRegions
} from '../spreadsheetBackendRepairReapply'

describe('spreadsheetBackendRepairReapply', () => {
  it('identifies server-authoritative repair reapplies by policy and reason', () => {
    expect(
      isServerAuthoritativeRepairReapply({
        reason: 'dirty_regions_from_backend_used',
        pendingLocalFilterPolicy: 'server_authoritative_repair'
      })
    ).toBe(true)

    expect(
      isServerAuthoritativeRepairReapply({
        reason: 'dirty_regions_from_backend_used',
        pendingLocalFilterPolicy: 'protect_in_flight_local_edits'
      })
    ).toBe(false)
  })

  it('returns no stale remainder when pending repair already fully covers the requested region', () => {
    expect(
      subtractAuthoritativeRepairRegions({
        target: { minRow: 10, maxRow: 12, minCol: 0, maxCol: 2 },
        coveredRegions: [{ minRow: 10, maxRow: 12, minCol: 0, maxCol: 2 }]
      })
    ).toEqual([])
  })

  it('returns only the uncovered stale remainder when pending repair partially overlaps', () => {
    expect(
      subtractAuthoritativeRepairRegions({
        target: { minRow: 10, maxRow: 12, minCol: 0, maxCol: 2 },
        coveredRegions: [{ minRow: 10, maxRow: 10, minCol: 0, maxCol: 2 }]
      })
    ).toEqual([{ minRow: 11, maxRow: 12, minCol: 0, maxCol: 2 }])
  })
})
