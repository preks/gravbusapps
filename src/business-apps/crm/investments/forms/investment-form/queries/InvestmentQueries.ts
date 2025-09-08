import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface InvestmentQueryVariables {
  id: string;
}

export interface InvestmentData {
  id: string;
  accountId: string;
  account: {
    id: string;
    name: string;
  };
  name: string;
  investmentGroupRef: string;
  investmentGroup: {
    id: string;
    code: string;
    value: string;
  };
  investmentTypeRef: string;
  investmentType: {
    id: string;
    code: string;
    value: string;
  };
  investmentPhaseRef: string;
  investmentPhase: {
    id: string;
    code: string;
    value: string;
  };
  investmentStatusRef: string;
  investmentStatus: {
    id: string;
    code: string;
    value: string;
  };
  investmentRiskLevelRef: string;
  investmentRiskLevel: {
    id: string;
    code: string;
    value: string;
  };
  currencyRef: string;
  currency: {
    id: string;
    code: string;
    value: string;
  };
  opportunityId: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  acquisitionDate: string;
  exitDate: string;
  plannedExitDate: string;
  notesSummary: string;
  bookValue: number;
  marketValue: number;
  initialInvestmentAmount: number;
  totalInvestmentAmount: number;
  stakePercent: number;
  debtFinancing: number;
  leverageRatio: number;
  equityInvestment?: {
    id: string;
    investmentRoleRef: string;
    investmentRole: {
      id: string;
      code: string;
      value: string;
    };
    currentCompanyValuation: number;
    lastReportedTurnover: number;
    lastReportedEbitda: number;
    version: number;
  };
  realEstateInvestment?: {
    id: string;
    realEstateTypeRef: string;
    realEstateType: {
      id: string;
      code: string;
      value: string;
    };
    countryRef: string;
    country: {
      id: string;
      code: string;
      value: string;
    };
    regionRef: string;
    region: {
      id: string;
      code: string;
      value: string;
    };
    addressLine: string;
    postalCode: string;
    city: string;
    investmentOwnershipStructureRef: string;
    investmentOwnershipStructure: {
      id: string;
      code: string;
      value: string;
    };
    size: number;
    sizeMeasurementUnitRef: string;
    sizeMeasurementUnit: {
      id: string;
      code: string;
      value: string;
    };
    numberOfUnits: number;
    buildingYear: number;
    occupancyPercent: number;
    annualExpenses: number;
    version: number;
  };
  liquidFundInvestment?: {
    id: string;
    accountNumber: string;
    earlyTerminationAllowed: boolean;
    interestRate: number;
    interestPaymentFrequencyRef: string;
    interestPaymentFrequency: {
      id: string;
      code: string;
      value: string;
    };
    maturityDate: string;
    version: number;
  };
  version: number;
}

export interface InvestmentDataResponse {
  InvestmentByPk: InvestmentData;
}

export const GET_INVESTMENT_BY_ID = `
  query GetInvestmentById($id: uuid!) {
    InvestmentByPk(id: $id) {
      id
      accountId
      account {
        id
        name
      }
      name
      investmentGroupRef
      investmentGroup {
        id
        code
        value
      }
      investmentTypeRef
      investmentType {
        id
        code
        value
      }
      investmentPhaseRef
      investmentPhase {
        id
        code
        value
      }
      investmentStatusRef
      investmentStatus {
        id
        code
        value
      }
      investmentRiskLevelRef
      investmentRiskLevel {
        id
        code
        value
      }
      currencyRef
      currency {
        id
        code
        value
      }
      opportunityId
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      acquisitionDate
      exitDate
      plannedExitDate
      notesSummary
      bookValue
      marketValue
      initialInvestmentAmount
      totalInvestmentAmount
      stakePercent
      debtFinancing
      leverageRatio
      equityInvestment {
        id
        investmentRoleRef
        investmentRole {
          id
          code
          value
        }
        currentCompanyValuation
        lastReportedTurnover
        lastReportedEbitda
        version
      }
      realEstateInvestment {
        id
        realEstateTypeRef
        realEstateType {
          id
          code
          value
        }
        countryRef
        country {
          id
          code
          value
        }
        regionRef
        region {
          id
          code
          value
        }
        addressLine
        postalCode
        city
        investmentOwnershipStructureRef
        investmentOwnershipStructure {
          id
          code
          value
        }
        size
        sizeMeasurementUnitRef
        sizeMeasurementUnit {
          id
          code
          value
        }
        numberOfUnits
        buildingYear
        occupancyPercent
        annualExpenses
        version
      }
      liquidFundInvestment {
        id
        accountNumber
        earlyTerminationAllowed
        interestRate
        interestPaymentFrequencyRef
        interestPaymentFrequency {
          id
          code
          value
        }
        maturityDate
        version
      }
      version
    }
  }
`;

export const useGetInvestmentById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentById = async (variables: InvestmentQueryVariables) => {
    try {
      const result = await graphqlClient.request<InvestmentDataResponse>(GET_INVESTMENT_BY_ID, variables);
      return result.InvestmentByPk;
    } catch (error) {
      console.error("Error fetching investment by ID:", error);
      throw error;
    }
  };

  return { fetchInvestmentById };
};
