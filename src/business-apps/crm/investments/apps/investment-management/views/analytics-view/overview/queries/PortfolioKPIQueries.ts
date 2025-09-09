import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface PortfolioKPIData {
  totalPortfolioValue: number;
  totalInvestments: number;
  totalAmountInvested: number;
  activeInvestments: number;
}

export interface PortfolioKPIComparison {
  current: PortfolioKPIData;
  previous: PortfolioKPIData;
}

export const GET_PORTFOLIO_KPIS_WITH_COMPARISON = (comparisonDate: string): string => {
  return `
    query GetPortfolioKPIsWithComparison {
      # Current data (all investments)
      currentAggregate: InvestmentAggregate {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Current active investments count
      currentActiveAggregate: InvestmentAggregate(
        where: {
          investmentStatus: { value: { _eq: "Active" } }
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Previous period data (investments existing 7 days ago)
      previousAggregate: InvestmentAggregate(
        where: {
          createdAt: { _lt: "${comparisonDate}" }
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Previous active investments count (investments that were active 7 days ago)
      previousActiveAggregate: InvestmentAggregate(
        where: {
          _and: [
            { createdAt: { _lt: "${comparisonDate}" } }
            { investmentStatus: { value: { _eq: "Active" } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

export interface PortfolioKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number;
      sum: {
        totalInvestmentAmount: number;
        investmentMarketValue: number;
      };
    };
  };
  currentActiveAggregate: {
    aggregate: {
      count: number;
    };
  };
  previousAggregate: {
    aggregate: {
      count: number;
      sum: {
        totalInvestmentAmount: number | null;
        investmentMarketValue: number | null;
      };
    };
  };
  previousActiveAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const useGetPortfolioKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchPortfolioKPIs = async (): Promise<PortfolioKPIComparison> => {
    // Calculate date 7 days ago for comparison
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const comparisonDate = sevenDaysAgo.toISOString();
    
    const query = GET_PORTFOLIO_KPIS_WITH_COMPARISON(comparisonDate);
    try {
      const result = await graphqlClient.request<PortfolioKPIResponse>(query);
      
      // Transform current data
      const current: PortfolioKPIData = {
        totalPortfolioValue: result.currentAggregate.aggregate.sum.investmentMarketValue || 0,
        totalInvestments: result.currentAggregate.aggregate.count,
        totalAmountInvested: result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0,
        activeInvestments: result.currentActiveAggregate.aggregate.count,
      };
      
      // Transform previous data (handle null values)
      const previous: PortfolioKPIData = {
        totalPortfolioValue: result.previousAggregate.aggregate.sum.investmentMarketValue || 0,
        totalInvestments: result.previousAggregate.aggregate.count,
        totalAmountInvested: result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0,
        activeInvestments: result.previousActiveAggregate.aggregate.count,
      };
      
      return { current, previous };
    } catch (error) {
      console.error('Error fetching portfolio KPIs:', error);
      throw error;
    }
  };

  return { fetchPortfolioKPIs };
};
