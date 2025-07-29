import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import {
  useGetInvestments,
  useGetLiquidFundInvestments,
  useGetEquityInvestments,
  useGetRealEstateInvestments,
  useGetPrivateEquityInvestments,
  InvestmentResponse,
  LiquidFundInvestmentResponse,
  EquityInvestmentResponse,
  RealEstateInvestmentResponse,
  PrivateEquityInvestmentResponse
} from '../queries';

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
  investments: InvestmentResponse[],
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
  sortOrder?: 'asc' | 'desc';
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

  const { fetchInvestments } = useGetInvestments(context);
  const { fetchLiquidFundInvestments } = useGetLiquidFundInvestments(context);
  const { fetchEquityInvestments } = useGetEquityInvestments(context);
  const { fetchRealEstateInvestments } = useGetRealEstateInvestments(context);
  const { fetchPrivateEquityInvestments } = useGetPrivateEquityInvestments(context);

  useEffect(() => {
    const loadData = async () => {
      if (!context.accessToken) return;

      setIsLoading(true);
      setError(null);

      try {
        // Build query variables with search and filters
        const queryVariables = {
          limit: 50,
          ...(options.searchTerm && {
            where: {
              _or: [
                { name: { _ilike: `%${options.searchTerm}%` } },
                { notesSummary: { _ilike: `%${options.searchTerm}%` } },
                { account: { name: { _ilike: `%${options.searchTerm}%` } } }
              ]
            }
          }),
          ...options.filters
        };

        // Fetch all investment types in parallel
        const [
          allInvestments,
          liquidFunds,
          equityInvestments,
          realEstateInvestments,
          privateEquityInvestments
        ] = await Promise.all([
          fetchInvestments(queryVariables),
          fetchLiquidFundInvestments(queryVariables),
          fetchEquityInvestments(queryVariables),
          fetchRealEstateInvestments(queryVariables),
          fetchPrivateEquityInvestments(queryVariables)
        ]);

        // Transform data into enhanced format
        const enhancedInvestments = transformInvestmentData(
          allInvestments,
          liquidFunds,
          equityInvestments,
          realEstateInvestments,
          privateEquityInvestments
        );

        const calculatedMetrics = calculateMetrics(enhancedInvestments);
        const calculatedTypeMetrics = calculateTypeMetrics(enhancedInvestments);

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
  }, [context.accessToken, refetchTrigger, options.searchTerm, options.filters]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  return {
    investments,
    metrics,
    typeMetrics,
    isLoading,
    error,
    refetch
  };
}; 