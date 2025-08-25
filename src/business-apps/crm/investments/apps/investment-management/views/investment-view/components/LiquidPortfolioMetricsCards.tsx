import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import {
  DollarSignIcon,
  WalletIcon,
  ActivityIcon,
  PercentIcon
} from 'lucide-react';
import { LiquidPortfolioMetrics, EnhancedLiquidPortfolio } from '../types/LiquidPortfolioTypes';

interface LiquidPortfolioMetricsCardsProps {
  portfolios: EnhancedLiquidPortfolio[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  'data-testid'?: string;
}

const LiquidPortfolioMetricsCards: React.FC<LiquidPortfolioMetricsCardsProps> = ({
  portfolios,
  isLoading = false,
  error = null,
  onRetry,
  'data-testid': dataTestId = 'liquid-portfolio-metrics'
}) => {

  const createTrendData = (value: number, description: string) => {
    if (value === 0) return undefined;
    const isPositive = value > 0;
    if (description.includes('yield')) {
      const sign = isPositive ? '+' : '';
      return {
        value: `${sign}${Math.abs(value).toFixed(2)}%`,
        positive: isPositive,
        description
      };
    }
    const baseValue = 10000;
    const percentage = Math.abs((value / baseValue) * 100);
    const sign = isPositive ? '+' : '';
    return {
      value: `${sign}${percentage.toFixed(1)}%`,
      positive: isPositive,
      description
    };
  };

  const calculateMetrics = (): LiquidPortfolioMetrics => {
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
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };
    const formatPercentage = (value: number): string => `${value.toFixed(2)}%`;
    return {
      totalPortfolios,
      totalMarketValue: formatCurrency(totalMarketValueNum),
      avgPerformance: formatCurrency(avgPerformanceNum),
      activePortfolios,
      avgYield: formatPercentage(avgYieldNum),
      totalCashFlow: formatCurrency(totalCashFlowNum),
      avgPerformanceNum,
      avgYieldNum,
      totalMarketValueNum
    };
  };

  const metrics = calculateMetrics();

  const widgets: WidgetItem[] = [
    {
      key: 'total-portfolios',
      title: 'Total Portfolios',
      value: isLoading ? '...' : metrics.totalPortfolios.toString(),
      prefix: <WalletIcon />,
      color: '#1890ff',
      description: 'All liquid fund portfolios',
      valueIsString: true,
      trend: isLoading ? undefined : (() => {
        const activeRatio = metrics.totalPortfolios > 0 ? (metrics.activePortfolios / metrics.totalPortfolios) * 100 : 0;
        const isPositive = activeRatio >= 50;
        return {
          value: `${activeRatio.toFixed(0)}% active`,
          positive: isPositive,
          description: 'portfolio status'
        };
      })()
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      value: isLoading ? '...' : metrics.totalMarketValue,
      prefix: <DollarSignIcon />,
      color: '#52c41a',
      description: 'Current portfolio value',
      valueIsString: true,
      trend: isLoading ? undefined : createTrendData(metrics.avgPerformanceNum || 0, 'vs previous period')
    },
    {
      key: 'avg-yield',
      title: 'Average Yield',
      value: isLoading ? '...' : metrics.avgYield,
      prefix: <PercentIcon />,
      color: '#fa8c16',
      description: 'Time-weighted compound yield',
      valueIsString: true,
      trend: isLoading ? undefined : createTrendData(metrics.avgYieldNum || 0, 'yield performance')
    },
    {
      key: 'avg-performance',
      title: 'Average Performance',
      value: isLoading ? '...' : metrics.avgPerformance,
      prefix: <ActivityIcon />,
      color: '#1677ff',
      description: 'Average change in market value',
      valueIsString: true,
      trend: isLoading ? undefined : createTrendData(metrics.avgPerformanceNum || 0, 'vs previous period')
    },
  ];

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={6}
        emptyText="No portfolio metrics available."
        data-testid={dataTestId}
      />
    </div>
  );
};

export default LiquidPortfolioMetricsCards;


