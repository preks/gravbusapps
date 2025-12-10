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
      deskCapacity
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
