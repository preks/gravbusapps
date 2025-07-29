import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits';

export interface InvestmentQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  where?: any;
  orderBy?: any;
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

const GET_LIQUID_FUND_INVESTMENTS_QUERY = `
  query GetLiquidFundInvestments($limit: Int, $offset: Int, $where: LiquidFundInvestmentBoolExp, $orderBy: [LiquidFundInvestmentOrderBy!]) {
    LiquidFundInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
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
  query GetEquityInvestments($limit: Int, $offset: Int, $where: EquityInvestmentBoolExp, $orderBy: [EquityInvestmentOrderBy!]) {
    EquityInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
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
  query GetRealEstateInvestments($limit: Int, $offset: Int, $where: RealEstateInvestmentBoolExp, $orderBy: [RealEstateInvestmentOrderBy!]) {
    RealEstateInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
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
  query GetPrivateEquityInvestments($limit: Int, $offset: Int, $where: PrivateEquityInvestmentBoolExp, $orderBy: [PrivateEquityInvestmentOrderBy!]) {
    PrivateEquityInvestment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
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

// Aggregate queries for total counts
const GET_LIQUID_FUND_INVESTMENTS_AGGREGATE_QUERY = `
  query GetLiquidFundInvestmentsAggregate($where: LiquidFundInvestmentBoolExp) {
    LiquidFundInvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_EQUITY_INVESTMENTS_AGGREGATE_QUERY = `
  query GetEquityInvestmentsAggregate($where: EquityInvestmentBoolExp) {
    EquityInvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_REAL_ESTATE_INVESTMENTS_AGGREGATE_QUERY = `
  query GetRealEstateInvestmentsAggregate($where: RealEstateInvestmentBoolExp) {
    RealEstateInvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_PRIVATE_EQUITY_INVESTMENTS_AGGREGATE_QUERY = `
  query GetPrivateEquityInvestmentsAggregate($where: PrivateEquityInvestmentBoolExp) {
    PrivateEquityInvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Hook for fetching liquid fund investments
export const useGetLiquidFundInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchLiquidFundInvestments = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 50),
      orderBy: variables.orderBy || [{ investment: { createdAt: 'DESC' } }]
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundInvestment: LiquidFundInvestmentResponse[] }>(
        GET_LIQUID_FUND_INVESTMENTS_QUERY,
        processedVariables
      );
      return result.LiquidFundInvestment || [];
    } catch (error) {
      console.error('Error fetching liquid fund investments:', error);
      throw error;
    }
  };

  const fetchLiquidFundInvestmentsCount = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundInvestmentAggregate: { aggregate: { count: number } } }>(
        GET_LIQUID_FUND_INVESTMENTS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.LiquidFundInvestmentAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching liquid fund investments count:', error);
      throw error;
    }
  };

  return { fetchLiquidFundInvestments, fetchLiquidFundInvestmentsCount };
};

// Hook for fetching equity investments
export const useGetEquityInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchEquityInvestments = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 50),
      orderBy: variables.orderBy || [{ investment: { createdAt: 'DESC' } }]
    };

    try {
      const result = await graphqlClient.request<{ EquityInvestment: EquityInvestmentResponse[] }>(
        GET_EQUITY_INVESTMENTS_QUERY,
        processedVariables
      );
      return result.EquityInvestment || [];
    } catch (error) {
      console.error('Error fetching equity investments:', error);
      throw error;
    }
  };

  const fetchEquityInvestmentsCount = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ EquityInvestmentAggregate: { aggregate: { count: number } } }>(
        GET_EQUITY_INVESTMENTS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.EquityInvestmentAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching equity investments count:', error);
      throw error;
    }
  };

  return { fetchEquityInvestments, fetchEquityInvestmentsCount };
};

// Hook for fetching real estate investments
export const useGetRealEstateInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchRealEstateInvestments = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 50),
      orderBy: variables.orderBy || [{ investment: { createdAt: 'DESC' } }]
    };

    try {
      const result = await graphqlClient.request<{ RealEstateInvestment: RealEstateInvestmentResponse[] }>(
        GET_REAL_ESTATE_INVESTMENTS_QUERY,
        processedVariables
      );
      return result.RealEstateInvestment || [];
    } catch (error) {
      console.error('Error fetching real estate investments:', error);
      throw error;
    }
  };

  const fetchRealEstateInvestmentsCount = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ RealEstateInvestmentAggregate: { aggregate: { count: number } } }>(
        GET_REAL_ESTATE_INVESTMENTS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.RealEstateInvestmentAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching real estate investments count:', error);
      throw error;
    }
  };

  return { fetchRealEstateInvestments, fetchRealEstateInvestmentsCount };
};

// Hook for fetching private equity investments
export const useGetPrivateEquityInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchPrivateEquityInvestments = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 50),
      orderBy: variables.orderBy || [{ investment: { createdAt: 'DESC' } }]
    };

    try {
      const result = await graphqlClient.request<{ PrivateEquityInvestment: PrivateEquityInvestmentResponse[] }>(
        GET_PRIVATE_EQUITY_INVESTMENTS_QUERY,
        processedVariables
      );
      return result.PrivateEquityInvestment || [];
    } catch (error) {
      console.error('Error fetching private equity investments:', error);
      throw error;
    }
  };

  const fetchPrivateEquityInvestmentsCount = async (variables: InvestmentQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ PrivateEquityInvestmentAggregate: { aggregate: { count: number } } }>(
        GET_PRIVATE_EQUITY_INVESTMENTS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.PrivateEquityInvestmentAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching private equity investments count:', error);
      throw error;
    }
  };

  return { fetchPrivateEquityInvestments, fetchPrivateEquityInvestmentsCount };
}; 