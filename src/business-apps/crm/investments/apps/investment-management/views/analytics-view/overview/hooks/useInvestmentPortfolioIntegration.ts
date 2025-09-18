import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InvestmentPortfolioKPIs, InvestmentQueryVariables } from '../types';
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments';
import { useGetPortfolioKPIs } from '../queries/PortfolioKPIQueries';
import type { Investment as CentralInvestment } from '@/common/data/investment/types';

export interface EnhancedInvestmentSummary {
  id: string;
  name: string;
  accountId?: string;
  opportunityId?: string;
  ownerEmployeeId?: string;
  investmentGroup?: string;
  investmentType?: string;
  investmentPhase?: string;
  investmentStatus?: string;
  investmentRiskLevel?: string;
  currency?: string;
  acquisitionDate?: string;
  exitDate?: string;
  plannedExitDate?: string;
  activeFrom?: string;
  activeTo?: string;
  marketValue?: number;
  initialInvestmentAmount?: number;
  totalInvestmentAmount?: number;
  stakePercent?: number;
  debtFinancing?: number;
  leverageRatio?: number;
  notesSummary?: string;
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  profitLoss: number;
  investmentAge: number;
  accountName?: string;
  opportunityName?: string;
}

export const useInvestmentPortfolioIntegration = (context: BusinessAppContextProps) => {
  const [investments, setInvestments] = useState<EnhancedInvestmentSummary[]>([]);
  const [kpis, setKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0
  });
  const [previousKpis, setPreviousKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(context);
  const { fetchPortfolioKPIs } = useGetPortfolioKPIs(context);

  const extractCurrencyCode = (inv: CentralInvestment): string => inv.currency?.code || 'EUR';

  const calculateROI = (marketValue: number, initialInvestment: number): number => {
    if (!initialInvestment || initialInvestment === 0) return 0;
    return ((marketValue - initialInvestment) / initialInvestment) * 100;
  };

  const calculateInvestmentAge = (acquisitionDate: string): number => {
    if (!acquisitionDate) return 0;
    const today = new Date();
    const acquired = new Date(acquisitionDate);
    const diffTime = Math.abs(today.getTime() - acquired.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'green';
      case 'pending': return 'orange';
      case 'exited': return 'red';
      case 'liquidated': return 'blue';
      default: return 'gray';
    }
  };

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      case 'very high': return 'volcano';
      default: return 'gray';
    }
  };

  const transformInvestmentData = useCallback((central: CentralInvestment[]): EnhancedInvestmentSummary[] => {
    return central.map((inv) => {
      const marketValue = inv.investmentMarketValue
        ?? inv.equityInvestment?.marketValue
        ?? 0;

      const initial = inv.initialInvestmentAmount || 0;
      const total = inv.totalInvestmentAmount || 0;
      const debt = inv.debtFinancingAmount || 0;
      const leverageRatio = total > 0 ? (debt / total) : undefined;

      const statusLabel = inv.investmentStatusLabel || inv.investmentStatus?.value || '';
      const riskLabel = inv.realEstateInvestment?.investmentRiskLevel?.value
        || inv.investmentRiskLevel?.value
        || '';

      return {
        id: inv.id,
        name: inv.name || inv.code || `Investment ${inv.id}`,
        accountId: inv.investmentAccount?.id,
        opportunityId: inv.investmentOpportunity?.id,
        ownerEmployeeId: inv.ownerEmployee?.id,
        investmentGroup: inv.investmentGroup?.value,
        investmentType: inv.investmentType?.value,
        investmentPhase: (inv as any).investmentPhase?.value,
        investmentStatus: statusLabel,
        investmentRiskLevel: riskLabel,
        currency: inv.currency?.value,
        acquisitionDate: inv.acquisitionDate || undefined,
        exitDate: inv.exitDate || undefined,
        plannedExitDate: inv.plannedExitDate || (inv as any).planedExit || undefined,
        activeFrom: inv.acquisitionDate || undefined,
        activeTo: inv.exitDate || undefined,
        marketValue,
        initialInvestmentAmount: initial,
        totalInvestmentAmount: total,
        stakePercent: (inv as any).stakePercent ?? inv.stakePercentage,
        debtFinancing: debt,
        leverageRatio,
        notesSummary: (inv as any).notesSummary,
        displayName: inv.displayName || inv.name || inv.code || `Investment ${inv.id}`,
        statusColor: getStatusColor(statusLabel),
        riskLevelColor: getRiskLevelColor(riskLabel),
        currencyCode: extractCurrencyCode(inv),
        roi: calculateROI(marketValue, initial),
        isActive: (inv.investmentStatus?.code || '').toLowerCase() === 'active',
        profitLoss: marketValue - initial,
        investmentAge: calculateInvestmentAge(inv.acquisitionDate || ''),
        accountName: inv.investmentAccount?.name,
        opportunityName: inv.investmentOpportunity?.name,
      };
    });
  }, []);

  const calculateKPIs = useCallback((enhancedInvestments: EnhancedInvestmentSummary[]): InvestmentPortfolioKPIs => {
    const totalPortfolioValue = enhancedInvestments.reduce((sum, inv) => sum + (inv.marketValue || 0), 0);
    const totalInvestments = enhancedInvestments.length;
    const activeInvestments = enhancedInvestments.filter(inv => inv.isActive).length;
    const totalAmountInvested = enhancedInvestments.reduce((sum, inv) => sum + (inv.totalInvestmentAmount || 0), 0);
    return { totalPortfolioValue, totalInvestments, totalAmountInvested, activeInvestments };
  }, []);

  const loadData = useCallback(async (variables: InvestmentQueryVariables = {}) => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch both investment data and KPIs with real historical comparison in parallel
      const [investmentResult, kpiResult] = await Promise.all([
        fetchInvestments({
          limit: variables.limit,
          offset: variables.offset,
          search: variables.search,
          orderBy: variables.orderBy?.map((o: any) => ({ field: o.field || 'createdAt', direction: (o.direction || 'DESC') as 'ASC' | 'DESC' }))
        }),
        fetchPortfolioKPIs()
      ]);
      
      // Process investment data for list display
      const enhancedInvestments = transformInvestmentData(investmentResult.Investment as unknown as CentralInvestment[]);
      
      // Use real KPI data with historical comparison
      setInvestments(enhancedInvestments);
      setKPIs(kpiResult.current);
      setPreviousKPIs(kpiResult.previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestments, fetchPortfolioKPIs, transformInvestmentData]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken]); // Only depend on accessToken, not loadData

  return {
    investments,
    kpis,
    previousKpis,
    isLoading,
    error,
    refetch: loadData
  };
};


