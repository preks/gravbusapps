import { StringHeaderIdentifier } from "@tanstack/react-table";

export interface LeadData {
  id: string;
  code: string;
  city: string;
  version: string;
  companyName: string;
  companyPhone: string;
  firstName: string;
  lastName: string;
  annualRevenue: {
    type: string;
    value: string;
    code: string;
  };
  annualRevenueRef: string;
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
  industryRef: string;
  legalForm: {
    type: string;
    value: string;
    id: string;
    code: string;
  };
  legalFormRef: string;
  numberOfEmployees: {
    id:string;
    type: string;
    value: string;
    code: string;
  };
  numberOfEmployeesRef: string;
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
  statusRef: string;
  region: {
    value: string;
    type: string;
    id: string;
    code: string;
  };
  regionRef: string;
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
      version
      companyName
      companyPhone
      firstName
      lastName
      annualRevenue {
        type
        value
        code
      }
      annualRevenueRef
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
      industryRef
      legalForm {
        type
        value
        id
        code
      }
      legalFormRef
      numberOfEmployees {
        id
        type
        value
        code
      }
      numberOfEmployeesRef
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
      statusRef
      region {
        value
        type
        id
        code
      }
      regionRef
    }
  }
`;
