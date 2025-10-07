import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface InvestmentAccountQueryVariables {
  accountId: string;
}

export interface InvestmentAccountDataResponse {
  InvestmentAccount: Array<{
    id: string;
    version: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    foundationDate?: string;
    geographicPresence?: string;
    specialty?: string;
    mission?: string;
    liquidationDate?: string;
    picture?: string;
    pictureThumbnail?: string;
    businessKey?: string;
    ownerEmployee?: {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      pictureThumbnail?: string;
    };
    legalForm?: {
      id: string;
      value: string;
      code: string;
      objectValue?: any;
    };
    industryClass?: {
      id: string;
      value: string;
      code: string;
      objectValue?: any;
    };
    companySize?: {
      id: string;
      value: string;
      code: string;
      objectValue?: any;
    };
    accountAnnualRevenueBand?: {
      id: string;
      value: string;
      code: string;
      objectValue?: any;
    };
    // Address relationships
    investmentAddress?: Array<{
      id: string;
      version: number;
      addressType?: string;
      addressLine?: any; // Jsonb
      postalCode?: string;
      locality?: string;
      regionRef?: string;
      countryRef?: string;
      region?: {
        id: string;
        value: string;
        code: string;
      };
      country?: {
        id: string;
        value: string;
        code: string;
      };
    }>;
    // Contact relationships
    investmentAccountContact?: Array<{
      id: string;
      contact: {
        id: string;
        firstName?: string;
        lastName?: string;
        fullName?: string;
        email?: string;
      };
    }>;
    // Audit fields
    createdAt: string;
    createdBy: string;
    // System fields
    additionalProperties?: any;
  }>;
}

export const GET_INVESTMENT_ACCOUNT_BY_ID = `
  query GetInvestmentAccountById($accountId: uuid!) {
    InvestmentAccount(where: { id: { _eq: $accountId }, isDeleted: { _eq: false } }) {
      id
      version
      code
      name
      email
      phone
      website
      foundationDate
      geographicPresence
      specialty
      mission
      liquidationDate
      picture
      pictureThumbnail
      businessKey
      
      # Employee relationship
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      
      # Catalog relationships
      legalForm {
        id
        value
        code
        objectValue
      }
      industryClass {
        id
        value
        code
        objectValue
      }
      companySize {
        id
        value
        code
        objectValue
      }
      accountAnnualRevenueBand {
        id
        value
        code
        objectValue
      }
      
      # Address relationships
      investmentAddress(where: { isDeleted: { _eq: false } }) {
        id
        version
        addressType
        addressLine
        postalCode
        locality
        regionRef
        countryRef
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
      
      # Contact relationships
      investmentAccountContact(where: { isDeleted: { _eq: false } }) {
        id
        contact {
          id
          firstName
          lastName
          fullName
          email
        }
      }
      
      # Audit fields
      createdAt
      createdBy
      
      # System fields
      additionalProperties
    }
  }
`;

export const useGetInvestmentAccountData = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentAccountData = async (
    variables: InvestmentAccountQueryVariables
  ) => {
    const query = GET_INVESTMENT_ACCOUNT_BY_ID;
    try {
      const result = await graphqlClient.request<InvestmentAccountDataResponse>(
        query,
        variables
      );
      return result;
    } catch (error) {
      console.error("Error fetching investment account data:", error);
      throw error;
    }
  };

  return { fetchInvestmentAccountData };
};
