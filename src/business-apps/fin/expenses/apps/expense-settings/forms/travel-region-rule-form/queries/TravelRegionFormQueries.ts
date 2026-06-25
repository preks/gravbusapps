// Function to build the query with optional country and/or text-search filter
export const GET_TRAVEL_REGIONS_WITH_COUNT = (countryCode?: string, searchTerm?: string) => {
  const filters: string[] = []
  if (countryCode) filters.push(`code: { _ilike: "%-${countryCode}-%" }`)
  if (searchTerm)
    filters.push(`_or: [{ value: { _ilike: "%${searchTerm}%" } }, { code: { _ilike: "%${searchTerm}%" } }]`)
  const filterStr = filters.join('\n')

  return `
    query GetTravelRegionsWithCount($parentEntryId: String!, $limit: Int!, $offset: Int!) {
      # Get the parent entry with count (optionally filtered by country / search)
      parent: CatalogEntry(where: { id: { _eq: $parentEntryId } }) {
        id
        childEntriesAggregate(
          where: { 
            isDeleted: { _eq: false }
            ${filterStr}
          }
        ) {
          aggregate {
            count
          }
        }
      }
      # Get the paginated child entries (optionally filtered by country / search)
      # Travel region codes follow format: "XX-CC-NNN" where CC is the country code
      # Example: "LU-BE-001" where BE is Belgium
      regions: CatalogEntry(
        where: {
          catalog: {
            identifier: { _eq: "TravelRegion" }
            version: { _eq: "v1" }
          }
          parentEntryId: { _eq: $parentEntryId }
          isDeleted: { _eq: false }
          ${filterStr}
        }
        orderBy: { code: ASC }
        limit: $limit
        offset: $offset
      ) {
        id
        code
        value
      }
    }
  `
}

// Function to build the query with optional country filter
export const GET_TRAVEL_REGIONS_BY_PARENT = (countryCode?: string) => {
  const countryFilter = countryCode ? `code: { _ilike: "%-${countryCode}-%" }` : ''

  return `
    query GetTravelRegionsByParent($parentEntryId: String!, $limit: Int!, $offset: Int!) {
      CatalogEntry(
        where: {
          catalog: {
            identifier: { _eq: "TravelRegion" }
            version: { _eq: "v1" }
          }
          parentEntryId: { _eq: $parentEntryId }
          isDeleted: { _eq: false }
          ${countryFilter}
        }
        orderBy: { code: ASC }
        limit: $limit
        offset: $offset
      ) {
        id
        code
        value
      }
    }
  `
}
