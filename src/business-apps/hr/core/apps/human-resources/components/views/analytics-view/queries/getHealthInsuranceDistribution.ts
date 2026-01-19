/**
 * Query to fetch health insurance distribution data
 * Gets counts of employees grouped by healthInsuranceName
 * Also fetches catalog entries for human-readable values
 */
export const GET_HEALTH_INSURANCE_DISTRIBUTION = `
  query GetHealthInsuranceDistribution {
    # Get employees with their tax details
    Employee(
      where: { 
        isDeleted: { _eq: false } 
      }
    ) {
      id
      taxDetails {
        healthInsuranceName
      }
    }
    
    # Get catalog entries for health insurance providers
    CatalogEntry(
      where: {
        type: { _eq: "HealthInsurer" }
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
