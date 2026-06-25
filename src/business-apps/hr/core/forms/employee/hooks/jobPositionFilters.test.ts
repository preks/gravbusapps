import { buildBaseFilter, buildVacancyFilter } from './jobPositionFilters'

describe('buildBaseFilter', () => {
  it('returns only the active condition when no orgUnit is selected', () => {
    const filter = buildBaseFilter({ todayIso: '2026-01-01' })
    expect(filter).toEqual({
      _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: '2026-01-01' } }]
    })
  })

  it('adds an organizationalUnit narrowing when an orgUnit is selected', () => {
    const filter = buildBaseFilter({ organizationalUnitId: 'ou-1', todayIso: '2026-01-01' })
    expect(filter).toEqual({
      _and: [
        { _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: '2026-01-01' } }] },
        {
          organizationalUnitEmployees: {
            organizationalUnit: { id: { _eq: 'ou-1' } }
          }
        }
      ]
    })
  })
})

describe('buildVacancyFilter', () => {
  it('scopes the null-assignment and non-null-assignment clauses by structureId when no orgUnit is selected', () => {
    const filter = buildVacancyFilter({ structureId: 'structure-1' })

    expect(filter).toEqual({
      _and: [
        {
          organizationalUnitEmployees: {
            _and: [{ structureId: { _eq: 'structure-1' } }, { employeeId: { _isNull: true } }]
          }
        },
        {
          _not: {
            organizationalUnitEmployees: {
              _and: [{ structureId: { _eq: 'structure-1' } }, { employeeId: { _isNull: false } }]
            }
          }
        }
      ]
    })
  })

  it('also scopes BOTH clauses by organizationalUnit.id when an orgUnit is selected', () => {
    const filter = buildVacancyFilter({ structureId: 'structure-1', organizationalUnitId: 'ou-1' })

    // The null-assignment side must include the organizationalUnit narrowing,
    // otherwise a position vacant in another unit would satisfy this clause.
    expect(filter._and[0]).toEqual({
      organizationalUnitEmployees: {
        _and: [
          { structureId: { _eq: 'structure-1' } },
          { employeeId: { _isNull: true } },
          { organizationalUnit: { id: { _eq: 'ou-1' } } }
        ]
      }
    })

    // The non-null-assignment side (negated) must ALSO include the
    // organizationalUnit narrowing, otherwise a position taken in another unit
    // would incorrectly remove this position from the dropdown.
    expect(filter._and[1]).toEqual({
      _not: {
        organizationalUnitEmployees: {
          _and: [
            { structureId: { _eq: 'structure-1' } },
            { employeeId: { _isNull: false } },
            { organizationalUnit: { id: { _eq: 'ou-1' } } }
          ]
        }
      }
    })
  })

  it('produces a different filter when an orgUnit is selected (regression guard)', () => {
    const unscoped = buildVacancyFilter({ structureId: 'structure-1' })
    const scoped = buildVacancyFilter({ structureId: 'structure-1', organizationalUnitId: 'ou-1' })
    expect(scoped).not.toEqual(unscoped)
  })
})
