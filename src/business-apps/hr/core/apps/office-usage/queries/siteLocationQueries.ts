/**
 * GraphQL queries for Site Location data
 */

export const GET_SITE_LOCATIONS = `
  query GetSiteLocations($structureId: uuid!) {
    SiteLocation(
      where: { 
        structureId: { _eq: $structureId }
        isDeleted: { _neq: true }
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      locality
      desk_capacity
      country {
        id
        code
        value
      }
      region {
        id
        code
        value
      }
    }
  }
`
