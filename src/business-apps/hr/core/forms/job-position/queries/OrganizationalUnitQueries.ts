export interface QueryVariablesOrganizationalUnit {
  structureId: string
  offset?: number
  limit?: number
  search?: string
}

export interface OrganizationalUnitItem {
  id: string
  name: string
}

const createSearchCondition = (search?: string): string => {
  if (!search || search.trim().length === 0) return ''

  // Escape the search term to prevent GraphQL injection
  const escapedSearch = search.replace(/"/g, '\\"')

  return `name: { _ilike: "%${escapedSearch}%" }`
}

export const GET_ORGANIZATIONAL_UNITS = (variables: QueryVariablesOrganizationalUnit): string => {
  const { offset, limit, structureId, search } = variables

  // Build where conditions
  const conditions: string[] = []

  // Always filter by isDeleted and structureId
  conditions.push(`isDeleted: {_eq: false}`)
  conditions.push(`structureId: {_eq: "${structureId}"}`)

  const searchCondition = createSearchCondition(search)
  if (searchCondition) {
    conditions.push(searchCondition)
  }

  const whereClause = `where: { ${conditions.join(', ')} }`
  const limitFormatted = `limit: ${limit || 20}`
  const offsetFormatted = `offset: ${offset || 0}`
  const orderByFormatted = `orderBy: { name: ASC }`

  // Build the arguments array and filter out empty ones
  const orgUnitArgs = [limitFormatted, offsetFormatted, whereClause, orderByFormatted]
    .filter(arg => arg.trim() !== '')
    .join('\n      ')

  const aggregateArgs = whereClause || ''

  return `query OrganizationalUnits {
    OrganizationalUnit(
      ${orgUnitArgs}
    ) {
      name
      id
    }${
      aggregateArgs
        ? `
    OrganizationalUnitAggregate(
      ${aggregateArgs}
    ) {
      aggregate {
        count
      }
    }`
        : `
    OrganizationalUnitAggregate {
      aggregate {
        count
      }
    }`
    }
  }`
}

export type OrganizationalUnitData = {
  OrganizationalUnit: OrganizationalUnitItem[]
  OrganizationalUnitAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const fetchOrganizationalUnitData = async (
  client: any, // GraphQL client instance
  variables: QueryVariablesOrganizationalUnit
): Promise<OrganizationalUnitData> => {
  const query = GET_ORGANIZATIONAL_UNITS(variables)

  return await client.request(query)
}
