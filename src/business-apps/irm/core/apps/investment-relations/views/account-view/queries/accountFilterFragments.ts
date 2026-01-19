/**
 * Filter Query Fragments for Investment Accounts
 * Each fragment fetches distinct values for a specific filter with limit 10
 */

export const OWNER_FILTER_FRAGMENT = `
  owners: InvestmentAccount(
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
  industries: InvestmentAccount(
    where: { 
      isDeleted: { _eq: false }
      industryClass: { id: { _isNull: false } }
    }
    distinctOn: [industryClassRef]
    limit: 10
    orderBy: [{ industryClassRef: ASC }]
  ) {
    industryClass {
      id
      code
      value
    }
  }
`

export const LEGAL_FORM_FILTER_FRAGMENT = `
  legalForms: InvestmentAccount(
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
  companySizes: InvestmentAccount(
    where: { 
      isDeleted: { _eq: false }
      companySize: { id: { _isNull: false } }
    }
    distinctOn: [companySizeRef]
    limit: 10
    orderBy: [{ companySizeRef: ASC }]
  ) {
    companySize {
      id
      code
      value
    }
  }
`

export const REVENUE_BAND_FILTER_FRAGMENT = `
  revenueBands: InvestmentAccount(
    where: { 
      isDeleted: { _eq: false }
      accountAnnualRevenueBand: { id: { _isNull: false } }
    }
    distinctOn: [accountAnnualRevenueBandRef]
    limit: 10
    orderBy: [{ accountAnnualRevenueBandRef: ASC }]
  ) {
    accountAnnualRevenueBand {
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
  query PrefetchInvestmentAccountFilters {
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
    // If empty search, just return top 10
    return `
      query SearchInvestmentAccountOwners {
        InvestmentAccount(
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
    query SearchInvestmentAccountOwners {
      InvestmentAccount(
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
      query SearchInvestmentAccountIndustries {
        InvestmentAccount(
          where: { 
            isDeleted: { _eq: false }
            industryClass: { id: { _isNull: false } }
          }
          distinctOn: [industryClassRef]
          limit: ${limit}
          orderBy: [{ industryClassRef: ASC }]
        ) {
          industryClass {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchInvestmentAccountIndustries {
      InvestmentAccount(
        where: { 
          isDeleted: { _eq: false }
          industryClass: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [industryClassRef]
        limit: ${limit}
        orderBy: [{ industryClassRef: ASC }]
      ) {
        industryClass {
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
      query SearchInvestmentAccountLegalForms {
        InvestmentAccount(
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
    query SearchInvestmentAccountLegalForms {
      InvestmentAccount(
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
      query SearchInvestmentAccountCompanySizes {
        InvestmentAccount(
          where: { 
            isDeleted: { _eq: false }
            companySize: { id: { _isNull: false } }
          }
          distinctOn: [companySizeRef]
          limit: ${limit}
          orderBy: [{ companySizeRef: ASC }]
        ) {
          companySize {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchInvestmentAccountCompanySizes {
      InvestmentAccount(
        where: { 
          isDeleted: { _eq: false }
          companySize: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [companySizeRef]
        limit: ${limit}
        orderBy: [{ companySizeRef: ASC }]
      ) {
        companySize {
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
      query SearchInvestmentAccountRevenueBands {
        InvestmentAccount(
          where: { 
            isDeleted: { _eq: false }
            accountAnnualRevenueBand: { id: { _isNull: false } }
          }
          distinctOn: [accountAnnualRevenueBandRef]
          limit: ${limit}
          orderBy: [{ accountAnnualRevenueBandRef: ASC }]
        ) {
          accountAnnualRevenueBand {
            id
            code
            value
          }
        }
      }
    `
  }

  return `
    query SearchInvestmentAccountRevenueBands {
      InvestmentAccount(
        where: { 
          isDeleted: { _eq: false }
          accountAnnualRevenueBand: { 
            _or: [
              { value: { _ilike: "%${searchTerm}%" } }
              { code: { _ilike: "%${searchTerm}%" } }
            ]
          }
        }
        distinctOn: [accountAnnualRevenueBandRef]
        limit: ${limit}
        orderBy: [{ accountAnnualRevenueBandRef: ASC }]
      ) {
        accountAnnualRevenueBand {
          id
          code
          value
        }
      }
    }
  `
}
