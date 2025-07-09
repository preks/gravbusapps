export interface CompanyData {
    id: string;
    name: string;
    version:number;
    website:string;
    legalForm: {
      value: string;
      code: string;
      id: string;
    };
    numberOfEmployees: {
      value: string;
    };
    contact: {
      firstName: string;
      lastName: string;
      email:string;
      phone:string;
    }[];
    addresses: {
      city: string;
      countryRef: string;
      version: number;
      regionRef: string;
      postalCode: string;
      id: string;
      addressType: string;
      addressLine: string;
      country: {
        id: string;
        value: string;
        code: string;
      };
      region: {
        id: string;
        value: string;
        code: string;
      };
    }[];
    numberOfEmployeesRef: string;
    foundationDate: string;
    industry: {
      id: string;
      code: string;
      value: string;
    };
    ownerEmployee: {
      id: string;
      lastName: string;
      firstName: string;
    };
  }
  
  export interface GetCompaniesResponse {
    Account: CompanyData[];
    AccountAggregate: {
      aggregate: {
        count: number;
      };
    };
  }

  export interface GetCompanyByIdResponse {
    Account: CompanyData[];
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
    contact {
      firstName
      lastName
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
`;

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
      website
      legalForm {
        value
        code
        id
      }
      numberOfEmployeesRef
      numberOfEmployees {
        value
      }
      contact {
        firstName
        lastName
        email
        phone
      }
      addresses {
        city
        countryRef
        version
        regionRef
        postalCode
        id
        addressType
        addressLine
        region {
          id
          value
          code
        }
        country {
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
  }
`;
