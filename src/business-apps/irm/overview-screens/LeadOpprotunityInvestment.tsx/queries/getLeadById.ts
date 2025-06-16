export interface LeadData {
  id: string;
  code: string;
  city: string;
  companyName: string;
  companyPhone: string;
  firstName: string;
  lastName: string;
  annualRevenue: {
    type: string;
    value: string;
    code: string;
  };
  companyEmail: string;
  countryRef: string;
  country: {
    id: string;
    code: string;
    type: string;
    value: string;
  };
  email: string;
  industry: {
    value: string;
    type: string;
    id: string;
    code: string;
  };
  numberOfEmployees: {
    type: string;
    value: string;
    code: string;
  };
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
  phoneNumber: string;
  ownerEmployeeId: string;
  postalCode: string;
  status: {
    value: string;
    code: string;
    type: string;
  };
  region: {
    value: string;
    type: string;
    id: string;
    code: string;
  };
}

export interface GetLeadByIdResponse {
  Lead: LeadData[];
}

export const GET_LEAD_BY_ID = `
  query GetLeadById(
    $id: uuid!
  ) { 
    Lead(
      where: { id: { _eq: $id } }
    ) {
      id
      code
      city
      companyName
      companyPhone
      firstName
      lastName
      annualRevenue {
        type
        value
        code
      }
      companyEmail
      countryRef
      country {
        id
        code
        type
        value
      }
      email
      industry {
        value
        type
        id
        code
      }
      numberOfEmployees {
        type
        value
        code
      }
      ownerEmployee {
        firstName
        lastName
      }
      phoneNumber
      ownerEmployeeId
      postalCode
      status {
        value
        code
        type
      }
      region {
        value
        type
        id
        code
      }
    }
  }
`;
