/**
 * Query for site locations used by asset filters.
 * Same structure as office-usage GET_SITE_LOCATIONS, scoped by structureId.
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
    }
  }
`

export interface SiteLocationOption {
  id: string
  name: string
}
