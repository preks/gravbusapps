/**
 * Pure helpers that build the GraphQL `where` clauses used by the Add Employee
 * form's Job Position dropdown.
 *
 * The vacancy check must be evaluated AT the selected organizational unit
 * (not just at structure level). Hasura's relation-exists semantics let two
 * separate `organizationalUnitEmployees` clauses match different rows, so a
 * position vacant in some other unit but already taken in the selected unit
 * would otherwise still satisfy both filters and appear in the dropdown.
 */

type Maybe<T> = T | null | undefined

export interface BuildBaseFilterParams {
  organizationalUnitId?: Maybe<string>
  todayIso?: string
}

export interface BuildVacancyFilterParams {
  structureId: string
  organizationalUnitId?: Maybe<string>
}

const buildActiveCondition = (todayIso: string) => ({
  _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: todayIso } }]
})

const buildOrgUnitCondition = (organizationalUnitId: string) => ({
  organizationalUnitEmployees: {
    organizationalUnit: {
      id: { _eq: organizationalUnitId }
    }
  }
})

/**
 * Builds the base `where` clause: active job positions, optionally narrowed to
 * the selected organizational unit via the `organizationalUnitEmployees`
 * relation.
 */
export const buildBaseFilter = ({ organizationalUnitId, todayIso }: BuildBaseFilterParams) => {
  const today = todayIso ?? new Date().toISOString().split('T')[0]
  const conditions: any[] = [buildActiveCondition(today)]

  if (organizationalUnitId) {
    conditions.push(buildOrgUnitCondition(organizationalUnitId))
  }

  return conditions.length === 1 ? conditions[0] : { _and: conditions }
}

/**
 * Builds the vacancy `where` clause.
 *
 * Vacant = there exists an `organizationalUnitEmployees` row in this structure
 * with `employeeId IS NULL`, **AND** there does NOT exist an
 * `organizationalUnitEmployees` row in this structure with `employeeId IS NOT NULL`.
 *
 * When an `organizationalUnitId` is supplied, both clauses are additionally
 * scoped to that organizational unit, so vacancy is evaluated AT the selected
 * unit. Without this scoping a position vacant in another unit but filled in
 * the selected unit would incorrectly satisfy the filter.
 */
export const buildVacancyFilter = ({ structureId, organizationalUnitId }: BuildVacancyFilterParams) => {
  const buildScopedAssignment = (employeeIdClause: { _isNull: boolean }) => {
    const conditions: any[] = [{ structureId: { _eq: structureId } }, { employeeId: employeeIdClause }]

    if (organizationalUnitId) {
      conditions.push({ organizationalUnit: { id: { _eq: organizationalUnitId } } })
    }

    return {
      organizationalUnitEmployees: {
        _and: conditions
      }
    }
  }

  return {
    _and: [buildScopedAssignment({ _isNull: true }), { _not: buildScopedAssignment({ _isNull: false }) }]
  }
}
