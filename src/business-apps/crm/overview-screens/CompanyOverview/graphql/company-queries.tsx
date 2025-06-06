export interface CompanyData {
    id: string;
    name: string;
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
    };
    addresses: {
      city: string;
      country: {
        id: string;
        value: string;
        code: string;
      };
    }[];
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
  
export const GET_COMPANIES = `
  query MyQuery (
  $where: AccountBoolExp
  $limit: Int 
  $offset: Int
) { 
  Account(
    where: $where 
    limit: $limit 
    offset: $offset
) {
    id
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
