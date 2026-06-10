import {
  buildAuthoritativePaintCoverageRegions,
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

  it('compacts staged direct paint cells into contiguous coverage regions', () => {
    expect(
      buildAuthoritativePaintCoverageRegions([
        { rowIndex: 5, colIndex: 1 },
        { rowIndex: 5, colIndex: 2 },
        { rowIndex: 5, colIndex: 4 },
        { rowIndex: 6, colIndex: 0 }
      ])
    ).toEqual([
      { minRow: 5, maxRow: 5, minCol: 1, maxCol: 2 },
      { minRow: 5, maxRow: 5, minCol: 4, maxCol: 4 },
      { minRow: 6, maxRow: 6, minCol: 0, maxCol: 0 }
    ])
  })

  it('returns no repair remainder when staged direct paint fully covers the backend region', () => {
    const coveredRegions = buildAuthoritativePaintCoverageRegions([
      { rowIndex: 10, colIndex: 0 },
      { rowIndex: 10, colIndex: 1 },
      { rowIndex: 10, colIndex: 2 }
    ])

    expect(
      subtractAuthoritativeRepairRegions({
        target: { minRow: 10, maxRow: 10, minCol: 0, maxCol: 2 },
        coveredRegions
      })
    ).toEqual([])
  })

  it('returns only the uncovered remainder for materialized-row direct paint coverage', () => {
    const coveredRegions = buildAuthoritativePaintCoverageRegions([
      { rowIndex: 4, colIndex: 0 },
      { rowIndex: 4, colIndex: 1 },
      { rowIndex: 5, colIndex: 0 }
    ])

    expect(
      subtractAuthoritativeRepairRegions({
        target: { minRow: 4, maxRow: 5, minCol: 0, maxCol: 1 },
        coveredRegions
      })
    ).toEqual([{ minRow: 5, maxRow: 5, minCol: 1, maxCol: 1 }])
  })
})
