/**
 * Query to fetch health insurance type distribution data from employeeTaxDetails
 * Gets counts of employees grouped by healthInsuranceTypeRef
 * Only includes non-deleted employees (isDeleted = false)
 * Also fetches catalog entries to display human-readable values
 */
export const GET_HEALTH_INSURANCE_TYPE_DISTRIBUTION = `
  query GetHealthInsuranceTypeDistribution {
    # Get employees with their tax details
    Employee(
      where: { 
        isDeleted: { _eq: false } 
      }
    ) {
      id
      taxDetails {
        healthInsuranceTypeRef
      }
    }
    
    # Get catalog entries for health insurance types
    CatalogEntry(
      where: {
        type: { _eq: "HealthInsuranceType" }
      }
    ) {
      id
      code
      value
      translations {
        localeCode
        value
      }
    }
    
    # Get total count of employees (for percentage calculation)
    EmployeePositionAggregate {
      aggregate {
        count
      }
    }
  }
`
