/**
 * Filter option queries for the Time & Absence Hub global filter bar.
 * These return lightweight `{ id, name }` shapes for the dropdowns.
 */

export const GET_HUB_SITE_LOCATIONS = `
  query GetHubSiteLocations($structureId: uuid!) {
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

export const GET_HUB_LEGAL_ENTITIES = `
  query GetHubLegalEntities($structureId: uuid!) {
    Company(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
      }
      orderBy: [{ name: ASC }]
    ) {
      id
      name
      code
    }
  }
`

export const GET_HUB_ORGANIZATIONAL_UNITS = `
  query GetHubOrganizationalUnits($structureId: uuid!) {
    OrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
      }
      orderBy: [{ name: ASC }]
    ) {
      id
      name
    }
  }
`

export const GET_HUB_MANAGERS = `
  query GetHubManagers($structureId: uuid!) {
    EmployeePosition(
      where: {
        structureId: { _eq: $structureId }
        supervisorEmployeeId: { _isNull: false }
      }
      distinctOn: [supervisorEmployeeId]
      orderBy: [{ supervisorEmployeeId: ASC }]
      limit: 1000
    ) {
      supervisorEmployee {
        id
        firstName
        lastName
      }
    }
  }
`

export interface HubFilterOption {
  id: string
  name: string
}

export interface HubManagerOption {
  id: string
  firstName: string
  lastName: string
}

export interface HubManagerPositionOption {
  supervisorEmployee?: HubManagerOption | null
}
