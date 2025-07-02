import { StringHeaderIdentifier } from "@tanstack/react-table";

export interface LeadData {
  id: string;
  code: string;
  city: string;
  name: string;
  version: string;
  companyName: string;
  companyPhone: string;
  firstName: string;
  lastName: string;
  status: {
    value: string;
    code: string;
    type: string;
  };
  statusRef: string;
  source: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  sourceRef: string;
  rating: string;
  annualRevenue: {
    type: string;
    value: string;
    code: string;
    id: string;
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
  companyWebsite: string;
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
  region: {
    value: string;
    type: string;
    id: string;
    code: string;
  };
  accountId:string;
  account: {
    id: string;
    version: string;
    name: string;
    industryRef: string;
    industry: {
      code: string;
      id: string;
      type: string;
      value: string;
    };
    numberOfEmployees: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    numberOfEmployeesRef: string;
    addressLine: string;
    foundationDate: string;
    annualRevenueRef: string;
    annualRevenue: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    website: string;
    ownerEmployeeId: string;
    ownerEmployee: {
      firstName: string;
      lastName: string;
    };
  };
  regionRef: string;
  leadRating: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  leadRatingRef: string;
  contact: {
    id: string;
    version: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    pictureUrl: string;
    jobTitle:string;
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
      name
      city
      version
      companyName
      rating
      statusRef
      status {
        id
        code
        value
        type
      }
      leadRatingRef
      leadRating{
        id
        type
        value
        code
      }
      sourceRef
      source {
       id
       type
       value
       code
      }
      companyPhone
      firstName
      lastName
      accountId
      account {
        id
        version
        name
        industryRef
        industry {
          code
          id
          type
          value
        }
        numberOfEmployees {
          type
          value
          id
          code
        }
        numberOfEmployeesRef
        ownerEmployeeId
        ownerEmployee {
          firstName
          lastName
        }
        addressLine
        foundationDate
        annualRevenueRef
        annualRevenue {
          type
          value
          id
          code
        }
        website
      }
      contact {
        id
        version
        email
        firstName
        lastName
        phone
        pictureUrl
        jobTitle
      } 
      annualRevenue {
        type
        value
        code
        id
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
      companyWebsite
      ownerEmployee {
        firstName
        lastName
      }
      phoneNumber
      ownerEmployeeId
      postalCode
      region {
        value
        type
        id
        code
      }
      regionRef
      contact {
        email
        firstName
        lastName
        phone
        pictureUrl
      }
    }
  }
`;
