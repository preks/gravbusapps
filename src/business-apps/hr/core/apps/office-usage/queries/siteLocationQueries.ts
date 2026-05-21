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

export const GET_SITE_LOCATIONS_BY_COMPANY = `
  query GetSiteLocationsByCompany(
    $structureId: uuid!
    $companyIds: [uuid!]!
    $asOfTs: timestamp!
  ) {
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

    EmployeeSiteLocation: SiteLocationEmployee(
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    ) {
      siteLocationId
    }
  }
`
