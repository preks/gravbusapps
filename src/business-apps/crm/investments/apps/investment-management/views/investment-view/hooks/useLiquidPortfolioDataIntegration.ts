import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import {
  useGetLiquidFundPortfolios,
  useGetLiquidFundPortfolioReports
} from '../queries/LiquidPortfolioQueries';
import {
  LiquidFundPortfolioResponse,
  LiquidFundPortfolioReportResponse,
  EnhancedLiquidPortfolio,
  LiquidPortfolioMetrics
} from '../types/LiquidPortfolioTypes';

const extractCurrencyCode = (currencyRef: string): string => {
  if (!currencyRef) return 'EUR';
  return currencyRef.split(':').pop() || 'EUR';
};

const formatCurrency = (amount: number, currencyRef: string): string => {
  const currency = extractCurrencyCode(currencyRef);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

const getPortfolioStatus = (endDate: string): string => {
  if (!endDate) return 'Active';
  const end = new Date(endDate);
  const now = new Date();
  return end > now ? 'Active' : 'Matured';
};

const transformLiquidPortfolioData = (
  portfolios: LiquidFundPortfolioResponse[],
  reports: LiquidFundPortfolioReportResponse[]
): EnhancedLiquidPortfolio[] => {
  return portfolios.map(portfolio => {
    const portfolioReports = reports.filter(
      report => report.liquidFundPortfolioId === portfolio.id
    );
    const latestReport = portfolioReports.sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    )[0];

    const marketValue = latestReport?.closeMarketValueAmount || 0;
    const changeValue = latestReport?.changeMarketValueAmount || 0;
    const performancePercent = latestReport?.timeWeightCompoundYieldPercent || 0;

    return {
      id: portfolio.id,
      proprietorName: portfolio.proprietorName || 'N/A',
      depositName: portfolio.depositName || 'N/A',
      isin: portfolio.isin || 'N/A',
      portfolioCode: portfolio.portfolioCode || 'N/A',
      positionDescription: portfolio.positionDescription || 'N/A',
      currency: extractCurrencyCode(portfolio.currencyRef),
      startDate: formatDate(portfolio.portfolioStartDate),
      endDate: portfolio.portfolioEndDate ? formatDate(portfolio.portfolioEndDate) : 'N/A',
      status: getPortfolioStatus(portfolio.portfolioEndDate),
      marketValue: formatCurrency(marketValue, portfolio.currencyRef || 'Currency:v1:EUR'),
      performance: `${changeValue >= 0 ? '+' : ''}${formatCurrency(changeValue, portfolio.currencyRef || 'Currency:v1:EUR')}`,
      performancePercent,
      group: portfolio.investmentGroup?.value || 'N/A',
      type: portfolio.investmentType?.value || 'N/A',
      rawData: portfolio,
      latestReport
    };
  });
};

const calculateLiquidPortfolioMetrics = (
  portfolios: EnhancedLiquidPortfolio[]
): LiquidPortfolioMetrics => {
  const totalPortfolios = portfolios.length;
  const activePortfolios = portfolios.filter(p => p.status === 'Active').length;
  const totalMarketValueNum = portfolios.reduce((sum, portfolio) => sum + (portfolio.latestReport?.closeMarketValueAmount || 0), 0);
  const totalCashFlowNum = portfolios.reduce((sum, portfolio) => sum + (portfolio.latestReport?.cashFlowAmount || 0), 0);
  const avgYieldNum = portfolios.length > 0
    ? portfolios.reduce((sum, portfolio) => sum + (portfolio.latestReport?.timeWeightCompoundYieldPercent || 0), 0) / portfolios.length
    : 0;
  const avgPerformanceNum = portfolios.length > 0
    ? portfolios.reduce((sum, portfolio) => sum + (portfolio.latestReport?.changeMarketValueAmount || 0), 0) / portfolios.length
    : 0;

  const defaultCurrency = portfolios[0]?.rawData.currencyRef || 'Currency:v1:EUR';

  return {
    totalPortfolios,
    totalMarketValue: formatCurrency(totalMarketValueNum, defaultCurrency),
    avgPerformance: formatCurrency(avgPerformanceNum, defaultCurrency),
    activePortfolios,
    avgYield: formatPercentage(avgYieldNum),
    totalCashFlow: formatCurrency(totalCashFlowNum, defaultCurrency),
    avgPerformanceNum,
    avgYieldNum,
    totalMarketValueNum
  };
};

export interface LiquidPortfolioDataIntegrationOptions {
  searchTerm?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  orderBy?: any;
  currentPage?: number;
  pageSize?: number;
}

export const useLiquidPortfolioDataIntegration = (
  context: BusinessAppContextProps,
  options: LiquidPortfolioDataIntegrationOptions = {}
) => {
  const [portfolios, setPortfolios] = useState<EnhancedLiquidPortfolio[]>([]);
  const [metrics, setMetrics] = useState<LiquidPortfolioMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const { 
    fetchLiquidFundPortfolios, 
    fetchLiquidFundPortfoliosCount 
  } = useGetLiquidFundPortfolios(context);
  
  const { 
    fetchLiquidFundPortfolioReports 
  } = useGetLiquidFundPortfolioReports(context);

  useEffect(() => {
    const loadData = async () => {
      if (!context.accessToken) return;

      setIsLoading(true);
      setError(null);

      try {
        let orderBy = options.orderBy;
        if (!orderBy && options.sortBy && options.sortOrder) {
          orderBy = [{ [options.sortBy]: options.sortOrder }];
        }
        if (!orderBy) {
          orderBy = [{ portfolioStartDate: 'DESC' }];
        }

        const pageSize = options.pageSize || 20;
        const currentPage = options.currentPage || 1;
        const offset = (currentPage - 1) * pageSize;

        let whereClause: any = {};
        if (options.searchTerm) {
          whereClause._or = [
            { proprietorName: { _ilike: `%${options.searchTerm}%` } },
            { depositName: { _ilike: `%${options.searchTerm}%` } },
            { positionDescription: { _ilike: `%${options.searchTerm}%` } },
            { compositePositionDescription: { _ilike: `%${options.searchTerm}%` } },
            { investmentGroup: { value: { _ilike: `%${options.searchTerm}%` } } },
            { investmentType: { value: { _ilike: `%${options.searchTerm}%` } } }
          ];
        }

        const queryVariables = {
          limit: pageSize,
          offset,
          orderBy,
          where: whereClause,
          ...options.filters
        } as any;

        const [portfoliosData, portfoliosCount] = await Promise.all([
          fetchLiquidFundPortfolios(queryVariables),
          fetchLiquidFundPortfoliosCount(queryVariables)
        ]);

        const portfolioIds = portfoliosData.map(p => p.id);
        let reportsData: LiquidFundPortfolioReportResponse[] = [];
        
        if (portfolioIds.length > 0) {
          reportsData = await fetchLiquidFundPortfolioReports({
            where: {
              liquidFundPortfolioId: { _in: portfolioIds }
            },
            orderBy: [{ reportDate: 'DESC' }]
          });
        }

        const enhancedPortfolios = transformLiquidPortfolioData(portfoliosData, reportsData);
        const calculatedMetrics = calculateLiquidPortfolioMetrics(enhancedPortfolios);

        setPortfolios(enhancedPortfolios);
        setMetrics(calculatedMetrics);
        setTotalCount(portfoliosCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error loading liquid portfolio data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    context.accessToken, 
    refetchTrigger, 
    options.searchTerm, 
    options.filters, 
    options.sortBy, 
    options.sortOrder, 
    options.orderBy, 
    options.currentPage, 
    options.pageSize
  ]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  return {
    portfolios,
    metrics,
    isLoading,
    error,
    refetch,
    totalCount
  };
};

export type { EnhancedLiquidPortfolio };



