/**
 * Filter Query Fragments for Customer Accounts
 * Each fragment fetches distinct values for a specific filter with limit 10
 */

export const OWNER_FILTER_FRAGMENT = `
  owners: Account(
    where: { 
      isDeleted: { _eq: false }
      ownerEmployee: { id: { _isNull: false } }
    }
    distinctOn: [ownerEmployeeId]
    limit: 10
    orderBy: [{ ownerEmployeeId: ASC }]
  ) {
    ownerEmployee {
      id
      displayName
      firstName
      lastName
    }
  }
`

export const INDUSTRY_FILTER_FRAGMENT = `
  industries: Account(
    where: { 
      isDeleted: { _eq: false }
      industry: { id: { _isNull: false } }
    }
    distinctOn: [industryRef]
    limit: 10
    orderBy: [{ industryRef: ASC }]
  ) {
    industry {
      id
      code
      value
    }
  }
`

export const LEGAL_FORM_FILTER_FRAGMENT = `
  legalForms: Account(
    where: { 
      isDeleted: { _eq: false }
      legalForm: { id: { _isNull: false } }
    }
    distinctOn: [legalFormRef]
    limit: 10
    orderBy: [{ legalFormRef: ASC }]
  ) {
    legalForm {
      id
      code
      value
    }
  }
`

export const COMPANY_SIZE_FILTER_FRAGMENT = `
  companySizes: Account(
    where: { 
      isDeleted: { _eq: false }
      numberOfEmployees: { id: { _isNull: false } }
    }
    distinctOn: [numberOfEmployeesRef]
    limit: 10
    orderBy: [{ numberOfEmployeesRef: ASC }]
  ) {
    numberOfEmployees {
      id
      code
      value
    }
  }
`

export const REVENUE_BAND_FILTER_FRAGMENT = `
  revenueBands: Account(
    where: { 
      isDeleted: { _eq: false }
      annualRevenue: { id: { _isNull: false } }
    }
    distinctOn: [annualRevenueRef]
    limit: 10
    orderBy: [{ annualRevenueRef: ASC }]
  ) {
    annualRevenue {
      id
      code
      value
    }
  }
`

/**
 * Combined prefetch query - loads first 10 distinct values for all filters
 */
export const PREFETCH_ALL_FILTERS_QUERY = `
  query PrefetchCustomerAccountFilters {
    ${OWNER_FILTER_FRAGMENT}
    ${INDUSTRY_FILTER_FRAGMENT}
    ${LEGAL_FORM_FILTER_FRAGMENT}
    ${COMPANY_SIZE_FILTER_FRAGMENT}
    ${REVENUE_BAND_FILTER_FRAGMENT}
  }
`

/**
 * Search query for owners with pagination
 */
export const SEARCH_OWNERS_QUERY = (searchTerm: string, limit: number = 50) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return `
      query SearchCustomerAccountOwners {
        Account(
          where: { 
            isDeleted: { _eq: false }
            ownerEmployee: { id: { _isNull: false } }
          }
          distinctOn: [ownerEmployeeId]
          limit: ${limit}
          orderBy: [{ ownerEmployeeId: ASC }]
        ) {
          ownerEmployee {
            id
            displayName
            firstName
            lastName
          }
        }
      }
    `
  }

  return `
    query SearchCustomerAccountOwners {
      Account(
        where: { 
          isDeleted: { _eq: false }
          ownerEmployee: { 
            _or: [
              { displayName: { _ilike: "%${searchTerm}%" } }
              { firstName: { _ilike: "%${searchTerm}%" } }
              { lastName: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [ownerEmployeeId]
        limit: ${limit}
        orderBy: [{ ownerEmployeeId: ASC }]
      ) {
        ownerEmployee {
          id
          displayName
          firstName
          lastName
        }
      }
    }
  `
}

/**
 * Search query for industries with pagination
 */
export const SEARCH_INDUSTRIES_QUERY = (searchTerm: string, limit: number = 50) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return `
      query SearchCustomerAccountIndustries {
        Account(
          where: { 
            isDeleted: { _eq: false }
            industry: { id: { _isNull: false } }
          }
          distinctOn: [industryRef]
          limit: ${limit}
          orderBy: [{ industryRef: ASC }]
        ) {
          industry {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchCustomerAccountIndustries {
      Account(
        where: { 
          isDeleted: { _eq: false }
          industry: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [industryRef]
        limit: ${limit}
        orderBy: [{ industryRef: ASC }]
      ) {
        industry {
          id
          code
          value
        }
      }
    }
  `
}

/**
 * Search query for legal forms with pagination
 */
export const SEARCH_LEGAL_FORMS_QUERY = (searchTerm: string, limit: number = 50) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return `
      query SearchCustomerAccountLegalForms {
        Account(
          where: { 
            isDeleted: { _eq: false }
            legalForm: { id: { _isNull: false } }
          }
          distinctOn: [legalFormRef]
          limit: ${limit}
          orderBy: [{ legalFormRef: ASC }]
        ) {
          legalForm {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchCustomerAccountLegalForms {
      Account(
        where: { 
          isDeleted: { _eq: false }
          legalForm: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [legalFormRef]
        limit: ${limit}
        orderBy: [{ legalFormRef: ASC }]
      ) {
        legalForm {
          id
          code
          value
        }
      }
    }
  `
}

/**
 * Search query for company sizes with pagination
 */
export const SEARCH_COMPANY_SIZES_QUERY = (searchTerm: string, limit: number = 50) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return `
      query SearchCustomerAccountCompanySizes {
        Account(
          where: { 
            isDeleted: { _eq: false }
            numberOfEmployees: { id: { _isNull: false } }
          }
          distinctOn: [numberOfEmployeesRef]
          limit: ${limit}
          orderBy: [{ numberOfEmployeesRef: ASC }]
        ) {
          numberOfEmployees {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchCustomerAccountCompanySizes {
      Account(
        where: { 
          isDeleted: { _eq: false }
          numberOfEmployees: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [numberOfEmployeesRef]
        limit: ${limit}
        orderBy: [{ numberOfEmployeesRef: ASC }]
      ) {
        numberOfEmployees {
          id
          code
          value
        }
      }
    }
  `
}

/**
 * Search query for revenue bands with pagination
 */
export const SEARCH_REVENUE_BANDS_QUERY = (searchTerm: string, limit: number = 50) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return `
      query SearchCustomerAccountRevenueBands {
        Account(
          where: { 
            isDeleted: { _eq: false }
            annualRevenue: { id: { _isNull: false } }
          }
          distinctOn: [annualRevenueRef]
          limit: ${limit}
          orderBy: [{ annualRevenueRef: ASC }]
        ) {
          annualRevenue {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchCustomerAccountRevenueBands {
      Account(
        where: { 
          isDeleted: { _eq: false }
          annualRevenue: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [annualRevenueRef]
        limit: ${limit}
        orderBy: [{ annualRevenueRef: ASC }]
      ) {
        annualRevenue {
          id
          code
          value
        }
      }
    }
  `
}
