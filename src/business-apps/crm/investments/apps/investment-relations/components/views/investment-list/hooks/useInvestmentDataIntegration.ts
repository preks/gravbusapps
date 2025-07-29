import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import {
  useGetLiquidFundInvestments,
  useGetEquityInvestments,
  useGetRealEstateInvestments,
  useGetPrivateEquityInvestments,
  LiquidFundInvestmentResponse,
  EquityInvestmentResponse,
  RealEstateInvestmentResponse,
  PrivateEquityInvestmentResponse,
  InvestmentResponse
} from '../queries/InvestmentQueries';

export interface EnhancedInvestment {
  id: string;
  name: string;
  type: string;
  subType: string;
  amount: string;
  bookValue: string;
  bookValueChange: string;
  expectedROI: string;
  status: string;
  dateAcquired: string;
  rawData: {
    investment: InvestmentResponse;
    specificData?: LiquidFundInvestmentResponse | EquityInvestmentResponse | RealEstateInvestmentResponse | PrivateEquityInvestmentResponse;
  };
}

export interface InvestmentMetrics {
  totalInvested: string;
  currentBookValue: string;
  bookValueChange: string;
  avgExpectedROI: string;
  totalInvestments: number;
  investmentTypes: number;
}

export interface InvestmentTypeMetrics {
  name: string;
  icon: string;
  color: string;
  investments: number;
  totalInvested: string;
  bookValue: string;
  avgROI: string;
  roiColor: string;
  subTypes: {
    name: string;
    amount: string;
    percentage: string;
  }[];
}

const extractCurrencyCode = (currencyId: string): string => {
  if (!currencyId) return 'EUR';
  return currencyId.split(':').pop() || 'EUR';
};

const formatCurrency = (amount: number, currencyId: string): string => {
  const currency = extractCurrencyCode(currencyId);
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

const calculateROI = (bookValue: number, initialAmount: number): number => {
  if (initialAmount === 0) return 0;
  return ((bookValue - initialAmount) / initialAmount) * 100;
};

const transformInvestmentData = (
  liquidFunds: LiquidFundInvestmentResponse[],
  equityInvestments: EquityInvestmentResponse[],
  realEstateInvestments: RealEstateInvestmentResponse[],
  privateEquityInvestments: PrivateEquityInvestmentResponse[]
): EnhancedInvestment[] => {
  const enhancedInvestments: EnhancedInvestment[] = [];

  // Transform liquid fund investments
  liquidFunds.forEach(liquidFund => {
    const investment = liquidFund.investment;
    if (!investment) return;

    const roi = calculateROI(investment.bookValue, investment.initialInvestmentAmount);
    const bookValueChange = investment.bookValue - investment.initialInvestmentAmount;
    const changePercent = (bookValueChange / investment.initialInvestmentAmount) * 100;

    enhancedInvestments.push({
      id: liquidFund.id,
      name: investment.name || 'N/A',
      type: 'Liquid Funds',
      subType: liquidFund.accountNumber ? 'Bank' : 'Strategic Liquidity',
      amount: formatCurrency(investment.initialInvestmentAmount, investment.currency?.id || 'Currency:v1:EUR'),
      bookValue: formatCurrency(investment.bookValue, investment.currency?.id || 'Currency:v1:EUR'),
      bookValueChange: `${bookValueChange >= 0 ? '+' : ''}${formatCurrency(bookValueChange, investment.currency?.id || 'Currency:v1:EUR')} (${changePercent.toFixed(1)}%)`,
      expectedROI: `${roi.toFixed(1)}%`,
      status: investment.investmentStatus?.value || 'active',
      dateAcquired: formatDate(investment.acquisitionDate),
      rawData: {
        investment,
        specificData: liquidFund
      }
    });
  });

  // Transform equity investments
  equityInvestments.forEach(equity => {
    const investment = equity.investment;
    if (!investment) return;

    const roi = calculateROI(investment.bookValue, investment.initialInvestmentAmount);
    const bookValueChange = investment.bookValue - investment.initialInvestmentAmount;
    const changePercent = (bookValueChange / investment.initialInvestmentAmount) * 100;

    enhancedInvestments.push({
      id: equity.id,
      name: investment.name || 'N/A',
      type: 'Equity',
      subType: equity.investmentRole?.value || 'General Equity',
      amount: formatCurrency(investment.initialInvestmentAmount, investment.currency?.id || 'Currency:v1:EUR'),
      bookValue: formatCurrency(investment.bookValue, investment.currency?.id || 'Currency:v1:EUR'),
      bookValueChange: `${bookValueChange >= 0 ? '+' : ''}${formatCurrency(bookValueChange, investment.currency?.id || 'Currency:v1:EUR')} (${changePercent.toFixed(1)}%)`,
      expectedROI: `${roi.toFixed(1)}%`,
      status: investment.investmentStatus?.value || 'active',
      dateAcquired: formatDate(investment.acquisitionDate),
      rawData: {
        investment,
        specificData: equity
      }
    });
  });

  // Transform real estate investments
  realEstateInvestments.forEach(realEstate => {
    const investment = realEstate.investment;
    if (!investment) return;

    const roi = calculateROI(investment.bookValue, investment.initialInvestmentAmount);
    const bookValueChange = investment.bookValue - investment.initialInvestmentAmount;
    const changePercent = (bookValueChange / investment.initialInvestmentAmount) * 100;

    enhancedInvestments.push({
      id: realEstate.id,
      name: investment.name || 'N/A',
      type: 'Real Estate',
      subType: realEstate.realEstateType?.value || 'Property',
      amount: formatCurrency(investment.initialInvestmentAmount, investment.currency?.id || 'Currency:v1:EUR'),
      bookValue: formatCurrency(investment.bookValue, investment.currency?.id || 'Currency:v1:EUR'),
      bookValueChange: `${bookValueChange >= 0 ? '+' : ''}${formatCurrency(bookValueChange, investment.currency?.id || 'Currency:v1:EUR')} (${changePercent.toFixed(1)}%)`,
      expectedROI: `${roi.toFixed(1)}%`,
      status: investment.investmentStatus?.value || 'active',
      dateAcquired: formatDate(investment.acquisitionDate),
      rawData: {
        investment,
        specificData: realEstate
      }
    });
  });

  // Transform private equity investments
  privateEquityInvestments.forEach(privateEquity => {
    const investment = privateEquity.investment;
    if (!investment) return;

    const roi = calculateROI(investment.bookValue, investment.initialInvestmentAmount);
    const bookValueChange = investment.bookValue - investment.initialInvestmentAmount;
    const changePercent = (bookValueChange / investment.initialInvestmentAmount) * 100;

    enhancedInvestments.push({
      id: privateEquity.id,
      name: investment.name || 'N/A',
      type: 'Private Equity',
      subType: privateEquity.investmentRole?.value || 'General PE',
      amount: formatCurrency(investment.initialInvestmentAmount, investment.currency?.id || 'Currency:v1:EUR'),
      bookValue: formatCurrency(investment.bookValue, investment.currency?.id || 'Currency:v1:EUR'),
      bookValueChange: `${bookValueChange >= 0 ? '+' : ''}${formatCurrency(bookValueChange, investment.currency?.id || 'Currency:v1:EUR')} (${changePercent.toFixed(1)}%)`,
      expectedROI: `${roi.toFixed(1)}%`,
      status: investment.investmentStatus?.value || 'active',
      dateAcquired: formatDate(investment.acquisitionDate),
      rawData: {
        investment,
        specificData: privateEquity
      }
    });
  });

  return enhancedInvestments;
};

const calculateMetrics = (investments: EnhancedInvestment[]): InvestmentMetrics => {
  const totalInvested = investments.reduce((sum, inv) => 
    sum + inv.rawData.investment.initialInvestmentAmount, 0
  );
  const totalBookValue = investments.reduce((sum, inv) => 
    sum + inv.rawData.investment.bookValue, 0
  );
  const bookValueChange = totalBookValue - totalInvested;
  const avgROI = investments.length > 0 ? 
    investments.reduce((sum, inv) => {
      const roi = calculateROI(inv.rawData.investment.bookValue, inv.rawData.investment.initialInvestmentAmount);
      return sum + roi;
    }, 0) / investments.length : 0;

  const investmentTypes = new Set(investments.map(inv => inv.type)).size;

  return {
    totalInvested: formatCurrency(totalInvested, 'Currency:v1:EUR'),
    currentBookValue: formatCurrency(totalBookValue, 'Currency:v1:EUR'),
    bookValueChange: `${bookValueChange >= 0 ? '+' : ''}${formatCurrency(bookValueChange, 'Currency:v1:EUR')}`,
    avgExpectedROI: `${avgROI.toFixed(1)}%`,
    totalInvestments: investments.length,
    investmentTypes
  };
};

const calculateTypeMetrics = (investments: EnhancedInvestment[]): InvestmentTypeMetrics[] => {
  const typeGroups = investments.reduce((groups, inv) => {
    if (!groups[inv.type]) groups[inv.type] = [];
    groups[inv.type].push(inv);
    return groups;
  }, {} as Record<string, EnhancedInvestment[]>);

  return Object.entries(typeGroups).map(([type, typeInvestments]) => {
    const totalInvested = typeInvestments.reduce((sum, inv) => 
      sum + inv.rawData.investment.initialInvestmentAmount, 0
    );
    const totalBookValue = typeInvestments.reduce((sum, inv) => 
      sum + inv.rawData.investment.bookValue, 0
    );
    const avgROI = typeInvestments.reduce((sum, inv) => {
      const roi = calculateROI(inv.rawData.investment.bookValue, inv.rawData.investment.initialInvestmentAmount);
      return sum + roi;
    }, 0) / typeInvestments.length;

    // Calculate subtypes
    const subTypeGroups = typeInvestments.reduce((groups, inv) => {
      if (!groups[inv.subType]) groups[inv.subType] = [];
      groups[inv.subType].push(inv);
      return groups;
    }, {} as Record<string, EnhancedInvestment[]>);

    const subTypes = Object.entries(subTypeGroups).map(([subType, subInvestments]) => {
      const subTotal = subInvestments.reduce((sum, inv) => 
        sum + inv.rawData.investment.initialInvestmentAmount, 0
      );
      const percentage = (subTotal / totalInvested) * 100;
      return {
        name: subType,
        amount: formatCurrency(subTotal, 'Currency:v1:EUR'),
        percentage: `${percentage.toFixed(1)}%`
      };
    });

    const getTypeConfig = (type: string) => {
      switch (type) {
        case 'Equity':
          return { icon: 'BarChart3', color: 'gba:bg-blue-500' };
        case 'Real Estate':
          return { icon: 'Home', color: 'gba:bg-green-500' };
        case 'Private Equity':
          return { icon: 'Briefcase', color: 'gba:bg-purple-500' };
        case 'Liquid Funds':
          return { icon: 'Banknote', color: 'gba:bg-amber-500' };
        default:
          return { icon: 'DollarSign', color: 'gba:bg-gray-500' };
      }
    };

    const config = getTypeConfig(type);

    return {
      name: type,
      icon: config.icon,
      color: config.color,
      investments: typeInvestments.length,
      totalInvested: formatCurrency(totalInvested, 'Currency:v1:EUR'),
      bookValue: formatCurrency(totalBookValue, 'Currency:v1:EUR'),
      avgROI: `${avgROI.toFixed(1)}%`,
      roiColor: avgROI >= 0 ? 'gba:text-green-600' : 'gba:text-red-600',
      subTypes
    };
  });
};

export interface InvestmentDataIntegrationOptions {
  searchTerm?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  orderBy?: any;
  currentPage?: number;
  pageSize?: number;
}

export const useInvestmentDataIntegration = (
  context: BusinessAppContextProps,
  options: InvestmentDataIntegrationOptions = {}
) => {
  const [investments, setInvestments] = useState<EnhancedInvestment[]>([]);
  const [metrics, setMetrics] = useState<InvestmentMetrics | null>(null);
  const [typeMetrics, setTypeMetrics] = useState<InvestmentTypeMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [totalCounts, setTotalCounts] = useState({
    liquidFunds: 0,
    equity: 0,
    realEstate: 0,
    privateEquity: 0,
    total: 0
  });

  const { fetchLiquidFundInvestments, fetchLiquidFundInvestmentsCount } = useGetLiquidFundInvestments(context);
  const { fetchEquityInvestments, fetchEquityInvestmentsCount } = useGetEquityInvestments(context);
  const { fetchRealEstateInvestments, fetchRealEstateInvestmentsCount } = useGetRealEstateInvestments(context);
  const { fetchPrivateEquityInvestments, fetchPrivateEquityInvestmentsCount } = useGetPrivateEquityInvestments(context);

  useEffect(() => {
    const loadData = async () => {
      if (!context.accessToken) return;

      setIsLoading(true);
      setError(null);

      try {
        // Build order by clause based on sorting options
        let orderBy = options.orderBy;
        if (!orderBy && options.sortBy && options.sortOrder) {
          // Convert simple sort to GraphQL orderBy format
          orderBy = [{ [options.sortBy]: options.sortOrder }];
        }
        if (!orderBy) {
          // Default sorting
          orderBy = [{ createdAt: 'DESC' }];
        }

        // For specific investment type queries, use nested investment ordering
        const nestedOrderBy = orderBy.map((order: any) => {
          const [field, direction] = Object.entries(order)[0];
          // If the field exists on the main investment table, nest it under 'investment'
          if (['name', 'acquisitionDate', 'bookValue', 'marketValue', 'initialInvestmentAmount', 'totalInvestmentAmount', 'createdAt', 'updatedAt'].includes(field)) {
            return { investment: { [field]: direction } };
          }
          return order;
        });

        // Calculate pagination parameters
        const pageSize = options.pageSize || 20;
        const currentPage = options.currentPage || 1;
        const offset = (currentPage - 1) * pageSize;

        const queryVariables = {
          limit: pageSize,
          offset: offset,
          orderBy: nestedOrderBy,
          ...(options.searchTerm && {
            where: {
              _or: [
                { investment: { name: { _ilike: `%${options.searchTerm}%` } } },
                { investment: { notesSummary: { _ilike: `%${options.searchTerm}%` } } },
                { investment: { account: { name: { _ilike: `%${options.searchTerm}%` } } } }
              ]
            }
          }),
          ...options.filters
        };

        // Fetch all investment types and their counts in parallel
        const [
          liquidFunds,
          equityInvestments,
          realEstateInvestments,
          privateEquityInvestments,
          liquidFundsCount,
          equityCount,
          realEstateCount,
          privateEquityCount
        ] = await Promise.all([
          fetchLiquidFundInvestments(queryVariables),
          fetchEquityInvestments(queryVariables),
          fetchRealEstateInvestments(queryVariables),
          fetchPrivateEquityInvestments(queryVariables),
          fetchLiquidFundInvestmentsCount(queryVariables),
          fetchEquityInvestmentsCount(queryVariables),
          fetchRealEstateInvestmentsCount(queryVariables),
          fetchPrivateEquityInvestmentsCount(queryVariables)
        ]);

        // Transform data into enhanced format
        const enhancedInvestments = transformInvestmentData(
          liquidFunds,
          equityInvestments,
          realEstateInvestments,
          privateEquityInvestments
        );

        const calculatedMetrics = calculateMetrics(enhancedInvestments);
        const calculatedTypeMetrics = calculateTypeMetrics(enhancedInvestments);

        // Update total counts
        const totalCount = liquidFundsCount + equityCount + realEstateCount + privateEquityCount;
        setTotalCounts({
          liquidFunds: liquidFundsCount,
          equity: equityCount,
          realEstate: realEstateCount,
          privateEquity: privateEquityCount,
          total: totalCount
        });

        setInvestments(enhancedInvestments);
        setMetrics(calculatedMetrics);
        setTypeMetrics(calculatedTypeMetrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error loading investment data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [context.accessToken, refetchTrigger, options.searchTerm, options.filters, options.sortBy, options.sortOrder, options.orderBy, options.currentPage, options.pageSize]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  return {
    investments,
    metrics,
    typeMetrics,
    isLoading,
    error,
    refetch,
    totalCounts
  };
}; 