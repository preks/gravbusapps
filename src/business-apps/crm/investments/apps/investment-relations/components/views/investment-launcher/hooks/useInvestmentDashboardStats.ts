import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { InvestmentDashboardStats } from '../types';

export const useInvestmentDashboardStats = (context: BusinessAppContextProps) => {
  const [stats, setStats] = useState<InvestmentDashboardStats>({
    // IRM Stats
    totalLeads: 0,
    totalOpportunities: 0,
    totalAccounts: 0,
    totalContacts: 0,
    
    // Investment Stats
    totalInvestments: 0,
    equityInvestments: 0,
    realEstateInvestments: 0,
    privateEquityInvestments: 0,
    liquidFunds: 0,
    totalPortfolioValue: 0,
    assetTypes: 0,
    averageROI: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchStats = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // GraphQL query to fetch CRM and investment data
      const query = `
        query GetInvestmentDashboardStats {
          # IRM Data (filtered by sourceApp and excluding deleted records)
          LeadAggregate(where: {sourceApp: {_eq: "IRM"}, isDeleted: {_eq: false}}) {
            aggregate {
              count
            }
          }
          
          OpportunityAggregate(where: {sourceApp: {_eq: "IRM"}, isDeleted: {_eq: false}}) {
            aggregate {
              count
            }
          }
          
          AccountAggregate(where: {sourceApp: {_eq: "IRM"}, isDeleted: {_eq: false}}) {
            aggregate {
              count
            }
          }
          
          ContactAggregate(where: {sourceApp: {_eq: "IRM"}, isDeleted: {_eq: false}}) {
            aggregate {
              count
            }
          }
          
          # Investment Data - Real data
          allInvestments: Investment {
            id
            initialInvestmentAmount
            bookValue
            investmentGroupRef
            investmentGroup {
              value
            }
            investmentTypeRef
            investmentType {
              id
              value
            }
          }
          
          # Get unique asset types (investment types)
          uniqueAssetTypes: Investment(distinctOn: [investmentTypeRef]) {
            investmentTypeRef
            investmentType {
              id
              value
            }
          }
        }
      `;

      const result = await graphqlClient.request(query);
      
      // Extract IRM data (filtered by sourceApp)
      const totalLeads = result.LeadAggregate?.aggregate?.count || 0;
      const totalOpportunities = result.OpportunityAggregate?.aggregate?.count || 0;
      const totalAccounts = result.AccountAggregate?.aggregate?.count || 0;
      const totalContacts = result.ContactAggregate?.aggregate?.count || 0;
      
      // Extract investment data (real data)
      const investments = result.allInvestments || [];
      const totalInvestments = investments.length;
      
      // Calculate asset types count (unique investment groups)
      const uniqueAssetTypesData = result.uniqueAssetTypes || [];
      const assetTypes = uniqueAssetTypesData.length;
      
      // Calculate total portfolio value
      const totalPortfolioValue = investments.reduce((sum: number, investment: any) => {
        return sum + (investment.bookValue || 0);
      }, 0);
      
      // Calculate average ROI
      let totalROI = 0;
      let validROICount = 0;
      
      investments.forEach((investment: any) => {
        if (investment.initialInvestmentAmount && investment.bookValue) {
          const roi = ((investment.bookValue - investment.initialInvestmentAmount) / investment.initialInvestmentAmount) * 100;
          totalROI += roi;
          validROICount++;
        }
      });
      
      const averageROI = validROICount > 0 ? totalROI / validROICount : 0;
      
      // Count investments by group (for the breakdown stats)
      const investmentsByGroup: { [key: string]: number } = {};
      investments.forEach((investment: any) => {
        const group = investment.investmentGroup?.value || 'Unknown';
        investmentsByGroup[group] = (investmentsByGroup[group] || 0) + 1;
      });
      
      const investmentStats: InvestmentDashboardStats = {
        // IRM Stats (real data)
        totalLeads,
        totalOpportunities,
        totalAccounts,
        totalContacts,
        
        // Investment Stats (real data)
        totalInvestments,
        equityInvestments: investmentsByGroup['Equity'] || 0,
        realEstateInvestments: investmentsByGroup['Real Estate'] || 0,
        privateEquityInvestments: investmentsByGroup['Private Equity'] || 0,
        liquidFunds: investmentsByGroup['Liquid Fund'] || 0,
        totalPortfolioValue,
        assetTypes,
        averageROI
      };

      setStats(investmentStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investment statistics');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, graphqlClient]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch
  };
}; 