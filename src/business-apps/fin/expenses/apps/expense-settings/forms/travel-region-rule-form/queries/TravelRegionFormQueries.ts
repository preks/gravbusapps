export const GET_TRAVEL_REGIONS_WITH_COUNT = `
  query GetTravelRegionsWithCount($parentEntryId: String!, $limit: Int!, $offset: Int!) {
    # Get the parent entry with count
    parent: CatalogEntry(where: { id: { _eq: $parentEntryId } }) {
      id
      childEntriesAggregate(where: { isDeleted: { _eq: false } }) {
        aggregate {
          count
        }
      }
    }
    # Get the paginated child entries
    regions: CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "TravelRegion" }
          version: { _eq: "v1" }
        }
        parentEntryId: { _eq: $parentEntryId }
        isDeleted: { _eq: false }
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
`;

export const GET_TRAVEL_REGIONS_BY_PARENT = `
  query GetTravelRegionsByParent($parentEntryId: String!, $limit: Int!, $offset: Int!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "TravelRegion" }
          version: { _eq: "v1" }
        }
        parentEntryId: { _eq: $parentEntryId }
        isDeleted: { _eq: false }
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
`;


