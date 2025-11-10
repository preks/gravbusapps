export interface CompanyData {
  id: string
  name: string
  email?: string
  phone?: string
  version: number
  website: string
  legalForm: {
    value: string
    code: string
    id: string
  }
  numberOfEmployees: {
    value: string
  }
  annualRevenue?: {
    id: string
    value: string
  }
  contact: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }[]
  addresses: {
    city: string
    countryRef: string
    version: number
    regionRef: string
    postalCode: string
    id: string
    addressType: string
    addressLine: string
    country: {
      id: string
      value: string
      code: string
    }
    region: {
      id: string
      value: string
      code: string
    }
  }[]
  numberOfEmployeesRef: string
  foundationDate: string
  createdAt?: string
  addressLine?: string
  industry: {
    id: string
    code: string
    value: string
  }
  ownerEmployee: {
    id: string
    lastName: string
    firstName: string
  }
}

export interface GetCompaniesResponse {
  Account: CompanyData[]
  AccountAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetCompanyByIdResponse {
  Account: CompanyData[]
}

export const GET_COMPANIES = `
  query MyQuery (
    $where: AccountBoolExp
    $limit: Int 
    $offset: Int
    $order_by: [AccountOrderBy!]
  ) { 
    Account(
      where: $where 
      limit: $limit 
      offset: $offset
      orderBy: $order_by
) {
    id
    version
    name
    website
    legalForm {
      value
      code
      id
    }
    numberOfEmployees {
      value
    }
    addresses {
      city
      country {
        id
        value
        code
      }
      region {
        id
        value
        code
      }
    }
    foundationDate
    industry {
      id
      code
      value
    }
    ownerEmployee {
      id
      lastName
      firstName
    }
  }
  AccountAggregate(where: $where)  {
    aggregate {
      count
    }
  }
}
`

export const GET_COMPANY_BY_ID = `
  query GetCompanyById(
    $id: uuid!
  ) { 
    Account(
      where: { id: { _eq: $id } }
    ) {
      id
      version
      name
      email
      phone
      website
      ownerEmployee {
        firstName
        lastName
      }
      createdAt
      legalForm {
        id
        value
      }
      industry {
        id
        value
      }
      numberOfEmployees {
        id
        value
      }
      annualRevenue {
        id
        value
      }
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        version
        contactType
        contact {
          id
          firstName
          lastName
          email
          phone
          jobTitle
          department
          linkedinUrl
          xingUrl
          pictureUrl
          communicationChannels(where: { isDeleted: { _eq: false } }) {
            id
            communicationChannelRef
            value
            communicationChannel {
              id
              code
              value
            }
          }
          academicTitle {
            id
            value
          }
        }
      }
      addresses {
        city
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
        postalCode
        addressLine
        addressType
      }
    }
  }
`
