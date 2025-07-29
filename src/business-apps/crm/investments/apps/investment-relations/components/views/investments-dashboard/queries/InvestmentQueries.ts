import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits';

export interface InvestmentQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  where?: any;
}

export interface InvestmentResponse {
  id: string;
  name: string;
  accountId: string;
  opportunityId: string;
  ownerEmployeeId: string;
  acquisitionDate: string;
  exitDate?: string;
  plannedExitDate?: string;
  notesSummary?: string;
  bookValue: number;
  marketValue: number;
  initialInvestmentAmount: number;
  totalInvestmentAmount: number;
  stakePercent: number;
  debtFinancing: number;
  leverageRatio: number;
  investmentGroup?: {
    id: string;
    code: string;
    value: string;
  };
  investmentType?: {
    id: string;
    code: string;
    value: string;
  };
  investmentPhase?: {
    id: string;
    code: string;
    value: string;
  };
  investmentStatus?: {
    id: string;
    code: string;
    value: string;
  };
  investmentRiskLevel?: {
    id: string;
    code: string;
    value: string;
  };
  currency?: {
    id: string;
    code: string;
    value: string;
  };
  account?: {
    id: string;
    name: string;
  };
  opportunity?: {
    id: string;
    name: string;
  };
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface LiquidFundInvestmentResponse {
  id: string;
  investmentId: string;
  accountNumber: string;
  earlyTerminationAllowed: boolean;
  interestRate: number;
  maturityDate: string;
  interestPaymentFrequency?: {
    id: string;
    code: string;
    value: string;
  };
  investment?: InvestmentResponse;
}

export interface EquityInvestmentResponse {
  id: string;
  investmentId: string;
  currentCompanyValuation: number;
  lastReportedTurnover: number;
  lastReportedEbitda: number;
  investmentRole?: {
    id: string;
    code: string;
    value: string;
  };
  investment?: InvestmentResponse;
}

export interface RealEstateInvestmentResponse {
  id: string;
  investmentId: string;
  addressLine: string;
  postalCode: string;
  city: string;
  buildingYear: string;
  size: number;
  numberOfUnits: number;
  occupancyPercent: number;
  annualExpenses: number;
  realEstateType?: {
    id: string;
    code: string;
    value: string;
  };
  country?: {
    id: string;
    code: string;
    value: string;
  };
  region?: {
    id: string;
    code: string;
    value: string;
  };
  investmentOwnershipStructure?: {
    id: string;
    code: string;
    value: string;
  };
  sizeMeasurementUnit?: {
    id: string;
    code: string;
    value: string;
  };
  investment?: InvestmentResponse;
}

export interface PrivateEquityInvestmentResponse {
  id: string;
  investmentId: string;
  investmentRole?: {
    id: string;
    code: string;
    value: string;
  };
  investment?: InvestmentResponse;
}

const GET_INVESTMENTS_QUERY = `
  query GetInvestments($limit: Int, $offset: Int, $where: InvestmentBoolExp) {
    Investment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: { createdAt: DESC }
    ) {
      id
      name
      accountId
      opportunityId
      ownerEmployeeId
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
      investmentGroup {
        id
        code
        value
      }
      investmentType {
        id
        code
        value
      }
      investmentPhase {
        id
        code
        value
      }
      investmentStatus {
        id
        code
        value
      }
      investmentRiskLevel {
        id
        code
        value
      }
      currency {
        id
        code
        value
      }
      account {
        id
        name
      }
      opportunity {
        id
        name
      }
      ownerEmployee {
        id
        firstName
        lastName
      }
    }
  }
`;

const GET_LIQUID_FUND_INVESTMENTS_QUERY = `
  query GetLiquidFundInvestments($limit: Int, $offset: Int, $where: LiquidFundInvestmentBoolExp) {
    LiquidFundInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: { createdAt: DESC }
    ) {
      id
      investmentId
      accountNumber
      earlyTerminationAllowed
      interestRate
      maturityDate
      interestPaymentFrequency {
        id
        code
        value
      }
      investment {
        id
        name
        accountId
        opportunityId
        ownerEmployeeId
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
        investmentGroup {
          id
          code
          value
        }
        investmentType {
          id
          code
          value
        }
        investmentPhase {
          id
          code
          value
        }
        investmentStatus {
          id
          code
          value
        }
        investmentRiskLevel {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        account {
          id
          name
        }
        opportunity {
          id
          name
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

const GET_EQUITY_INVESTMENTS_QUERY = `
  query GetEquityInvestments($limit: Int, $offset: Int, $where: EquityInvestmentBoolExp) {
    EquityInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: { createdAt: DESC }
    ) {
      id
      investmentId
      currentCompanyValuation
      lastReportedTurnover
      lastReportedEbitda
      investmentRole {
        id
        code
        value
      }
      investment {
        id
        name
        accountId
        opportunityId
        ownerEmployeeId
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
        investmentGroup {
          id
          code
          value
        }
        investmentType {
          id
          code
          value
        }
        investmentPhase {
          id
          code
          value
        }
        investmentStatus {
          id
          code
          value
        }
        investmentRiskLevel {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        account {
          id
          name
        }
        opportunity {
          id
          name
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

const GET_REAL_ESTATE_INVESTMENTS_QUERY = `
  query GetRealEstateInvestments($limit: Int, $offset: Int, $where: RealEstateInvestmentBoolExp) {
    RealEstateInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: { createdAt: DESC }
    ) {
      id
      investmentId
      addressLine
      postalCode
      city
      buildingYear
      size
      numberOfUnits
      occupancyPercent
      annualExpenses
      realEstateType {
        id
        code
        value
      }
      country {
        id
        code
        value
      }
      region {
        id
        code
        value
      }
      investmentOwnershipStructure {
        id
        code
        value
      }
      sizeMeasurementUnit {
        id
        code
        value
      }
      investment {
        id
        name
        accountId
        opportunityId
        ownerEmployeeId
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
        investmentGroup {
          id
          code
          value
        }
        investmentType {
          id
          code
          value
        }
        investmentPhase {
          id
          code
          value
        }
        investmentStatus {
          id
          code
          value
        }
        investmentRiskLevel {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        account {
          id
          name
        }
        opportunity {
          id
          name
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

const GET_PRIVATE_EQUITY_INVESTMENTS_QUERY = `
  query GetPrivateEquityInvestments($limit: Int, $offset: Int, $where: PrivateEquityInvestmentBoolExp) {
    PrivateEquityInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: { createdAt: DESC }
    ) {
      id
      investmentId
      investmentRole {
        id
        code
        value
      }
      investment {
        id
        name
        accountId
        opportunityId
        ownerEmployeeId
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
        investmentGroup {
          id
          code
          value
        }
        investmentType {
          id
          code
          value
        }
        investmentPhase {
          id
          code
          value
        }
        investmentStatus {
          id
          code
          value
        }
        investmentRiskLevel {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        account {
          id
          name
        }
        opportunity {
          id
          name
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  }
`;

// Hook for fetching investments
export const useGetInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchInvestments = async (variables: InvestmentQueryVariables = {}) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{ Investment: InvestmentResponse[] }>(
        GET_INVESTMENTS_QUERY,
        safeVariables
      );
      return result.Investment || [];
    } catch (error) {
      console.error('Error fetching investments:', error);
      throw error;
    }
  };

  return { fetchInvestments };
};

// Hook for fetching liquid fund investments
export const useGetLiquidFundInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchLiquidFundInvestments = async (variables: InvestmentQueryVariables = {}) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{ LiquidFundInvestment: LiquidFundInvestmentResponse[] }>(
        GET_LIQUID_FUND_INVESTMENTS_QUERY,
        safeVariables
      );
      return result.LiquidFundInvestment || [];
    } catch (error) {
      console.error('Error fetching liquid fund investments:', error);
      throw error;
    }
  };

  return { fetchLiquidFundInvestments };
};

// Hook for fetching equity investments
export const useGetEquityInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchEquityInvestments = async (variables: InvestmentQueryVariables = {}) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{ EquityInvestment: EquityInvestmentResponse[] }>(
        GET_EQUITY_INVESTMENTS_QUERY,
        safeVariables
      );
      return result.EquityInvestment || [];
    } catch (error) {
      console.error('Error fetching equity investments:', error);
      throw error;
    }
  };

  return { fetchEquityInvestments };
};

// Hook for fetching real estate investments
export const useGetRealEstateInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchRealEstateInvestments = async (variables: InvestmentQueryVariables = {}) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{ RealEstateInvestment: RealEstateInvestmentResponse[] }>(
        GET_REAL_ESTATE_INVESTMENTS_QUERY,
        safeVariables
      );
      return result.RealEstateInvestment || [];
    } catch (error) {
      console.error('Error fetching real estate investments:', error);
      throw error;
    }
  };

  return { fetchRealEstateInvestments };
};

// Hook for fetching private equity investments
export const useGetPrivateEquityInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchPrivateEquityInvestments = async (variables: InvestmentQueryVariables = {}) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{ PrivateEquityInvestment: PrivateEquityInvestmentResponse[] }>(
        GET_PRIVATE_EQUITY_INVESTMENTS_QUERY,
        safeVariables
      );
      return result.PrivateEquityInvestment || [];
    } catch (error) {
      console.error('Error fetching private equity investments:', error);
      throw error;
    }
  };

  return { fetchPrivateEquityInvestments };
}; 