/** GraphQL documents for client-side data quality (replace with BFF call when available). */

export const GET_ACTIVE_STRUCTURE_ID = /* GraphQL */ `
  query DataQualityActiveStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
    }
  }
`

export const DATA_QUALITY_EMPLOYEES = /* GraphQL */ `
  query DataQualityEmployees($where: EmployeeBoolExp!, $limit: Int!, $structureId: uuid!) {
    Employee(where: $where, limit: $limit, orderBy: { fullName: ASC }) {
      id
      fullName
      displayName
      code
      companyEmployees(where: { company: { isDeleted: { _eq: false } } }, limit: 40) {
        companyId
        company {
          id
          name
        }
      }
      employeePositions(
        where: {
          exitDate: { _isNull: true }
          employee: { isDeleted: { _eq: false } }
          structureId: { _eq: $structureId }
        }
        orderBy: { hireDate: DESC_NULLS_LAST }
        limit: 12
      ) {
        id
        structureId
        companyId
        company {
          id
          name
        }
        siteLocationId
        siteLocation {
          id
          name
        }
        costCenterId
        costCenter {
          id
          name
        }
        organizationalUnitId
        organizationalUnit {
          id
          name
        }
        jobPositionId
        hireDate
        jobPosition {
          id
          name
          jobProfileId
          jobProfile {
            id
            name
            description
            descriptionI18n
            jobProfileSkillsAggregate(where: { isDeleted: { _eq: false } }) {
              aggregate {
                count
              }
            }
          }
        }
      }
      workingCondition(where: { isDeleted: { _eq: false } }, limit: 1, orderBy: { updatedAt: DESC }) {
        contractTypeRef
        employmentTypeRef
        hireDate
      }
      workingHours(where: { isDeleted: { _eq: false } }, orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]) {
        activeFrom
        activeTo
        weeklyHours
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
      }
      taxDetails(where: { isDeleted: { _eq: false } }, limit: 1, orderBy: { updatedAt: DESC }) {
        taxIdentificationNumber
        socialSecurityNumber
        taxNumber
      }
      bankAccounts(where: { isDeleted: { _eq: false } }) {
        id
        iban
        accountNumber
      }
    }
  }
`

/** Scoped to active job definitions within the active structure. */
export const DATA_QUALITY_JOB_ARCHITECTURE = /* GraphQL */ `
  query DataQualityJobArchitecture(
    $jpLimit: Int!
    $jprofLimit: Int!
    $jobPositionWhere: JobPositionBoolExp!
    $missingJobPositionWhere: JobPositionBoolExp!
    $jobProfileWhere: JobProfileBoolExp!
  ) {
    jobPositionsTotal: JobPositionAggregate(where: $jobPositionWhere) {
      aggregate {
        count
      }
    }
    jobPositionsMissingProfile: JobPositionAggregate(where: $missingJobPositionWhere) {
      aggregate {
        count
      }
    }
    jobPositionsSample: JobPosition(where: $missingJobPositionWhere, limit: $jpLimit, orderBy: { businessKey: ASC }) {
      id
      name
      version
      activeTo
      jobProfileId
      jobProfile {
        id
        name
        code
      }
      jobFunction {
        id
        name
        code
        jobFamily {
          id
          name
          code
        }
      }
      jobLevel {
        id
        name
        code
        hierarchyOrder
      }
      employeePositions(where: { exitDate: { _isNull: true } }) {
        firstName
        lastName
        employeeId
        supervisor {
          id
          firstName
          lastName
        }
      }
      organizationalUnitEmployees {
        organizationalUnit {
          id
          name
        }
        siteLocation {
          id
          name
        }
      }
    }
    jobProfiles: JobProfile(where: $jobProfileWhere, limit: $jprofLimit, orderBy: { code: ASC }) {
      id
      version
      name
      code
      description
      descriptionI18n
      jobFunction {
        id
        name
        code
      }
      jobLevel {
        id
        name
        code
        hierarchyOrder
      }
      jobProfileSkills(where: { isDeleted: { _eq: false } }) {
        id
        requiredLevel
        skill {
          id
          name
        }
      }
      jobProfileSkillsAggregate(where: { isDeleted: { _eq: false } }) {
        aggregate {
          count
        }
      }
    }
  }
`

export const FILTER_SITE_LOCATIONS = /* GraphQL */ `
  query DataQualitySiteLocations($limit: Int!) {
    SiteLocation(where: { isDeleted: { _eq: false } }, limit: $limit, orderBy: { name: ASC }) {
      id
      name
      code
    }
  }
`

export const FILTER_ORG_UNITS = /* GraphQL */ `
  query DataQualityOrgUnits($structureId: uuid!, $limit: Int!) {
    OrganizationalUnit(
      where: { isDeleted: { _eq: false }, structureId: { _eq: $structureId } }
      limit: $limit
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`
