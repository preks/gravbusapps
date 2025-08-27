import React, { useEffect, useState } from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
// import type { InvestmentOpportunity } from '@/common/data/investment/types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useOpportunityStatisticsQueries } from '../queries/OpportunityStatisticsQueries';

interface OpportunityStatisticsProps extends BusinessAppContextProps {}

export const OpportunityStatistics: React.FC<OpportunityStatisticsProps> = ({ ...context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { fetchRecentOpportunitiesWithTrend, fetchOpportunityValueWithTrend, fetchWinRateWithTrend, fetchOpportunitiesThisYearWithTrend } = useOpportunityStatisticsQueries(context);

  const [recent, setRecent] = useState<{ current: number; changePercent: number; isPositive: boolean }>({ current: 0, changePercent: 0, isPositive: true });
  const [value, setValue] = useState<{ current: number; changePercent: number; isPositive: boolean }>({ current: 0, changePercent: 0, isPositive: true });
  const [win, setWin] = useState<{ current: number; changePercent: number; isPositive: boolean }>({ current: 0, changePercent: 0, isPositive: true });
  const [year, setYear] = useState<{ current: number; changePercent: number; isPositive: boolean }>({ current: 0, changePercent: 0, isPositive: true });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [r, v, w, y] = await Promise.all([
          fetchRecentOpportunitiesWithTrend(),
          fetchOpportunityValueWithTrend(),
          fetchWinRateWithTrend(),
          fetchOpportunitiesThisYearWithTrend(),
        ]);
        const trend = (t: { current: number; previous: number }) => ({
          current: t.current,
          changePercent: t.previous > 0 ? ((t.current - t.previous) / t.previous) * 100 : (t.current > 0 ? 100 : 0),
          isPositive: t.current - t.previous >= 0,
        });
        setRecent(trend(r));
        setValue(trend(v));
        setWin(trend(w));
        setYear(trend(y));
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load opportunity statistics'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // Run once on mount; hooks are memoized with useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-opportunities',
      title: 'Recent Opportunities',
      value: recent.current,
      prefix: <ClockCircleOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(recent.changePercent),
        positive: recent.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'total-pipeline-value',
      title: 'Total Pipeline Value',
      value: formatCurrency(value.current),
      prefix: <DollarOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All opportunities',
      trend: {
        value: formatTrendPercent(value.changePercent),
        positive: value.isPositive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-win-rate',
      title: 'Average Win Rate',
      value: win.current,
      prefix: <TrophyOutlined />,
      color: '#fa8c16',
      suffix: '%',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Winning chance',
      trend: {
        value: formatTrendPercent(win.changePercent),
        positive: win.isPositive,
        description: 'vs last year'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: year.current,
      prefix: <RiseOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New opportunities',
      trend: {
        value: formatTrendPercent(year.changePercent),
        positive: year.isPositive,
        description: 'vs same period last year'
      }
    }
  ];

  return (
    <div data-testid="opportunity-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={() => window.location.reload()}
        skeletonCount={4}
        emptyText="No opportunity statistics available."
        data-testid="opportunity-statistics-with-trend"
      />
    </div>
  );
};
