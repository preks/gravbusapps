import React from 'react';
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system';
import type { HeadcountStatistics } from '../hooks/useHeadcountTrendsData';

interface HeadcountStatisticsProps {
  statistics: HeadcountStatistics;
  isLoading: boolean;
  dataTestId: string;
}

const HeadcountStatistics: React.FC<HeadcountStatisticsProps> = ({
  statistics,
  isLoading,
  dataTestId
}) => {
  const kpiCards: KpiCardData[] = [
    {
      id: 'monthly-hires',
      title: 'Monthly Hires',
      value: statistics.monthlyHires,
      icon: 'users',
      iconColor: '#52c41a',
      footer: 'New hires this month'
    },
    {
      id: 'monthly-departures',
      title: 'Monthly Departures',
      value: statistics.monthlyExits,
      icon: 'users',
      iconColor: '#ff4d4f',
      footer: 'Departures this month'
    },
    {
      id: 'net-change',
      title: 'Net Change',
      value: statistics.netChange > 0 ? `+${statistics.netChange}` : statistics.netChange.toString(),
      icon: 'users',
      iconColor: statistics.netChange >= 0 ? '#52c41a' : '#ff4d4f',
      footer: 'Monthly headcount change'
    },
    {
      id: 'growth-rate',
      title: 'Growth Rate',
      value: `${statistics.growthRate > 0 ? '+' : ''}${statistics.growthRate.toFixed(2)}%`,
      icon: 'calendar',
      iconColor: statistics.growthRate >= 0 ? '#52c41a' : '#ff4d4f',
      footer: 'Monthly growth percentage'
    }
  ];

  if (isLoading) {
    // Create loading placeholder cards
    const loadingCards: KpiCardData[] = kpiCards.map(card => ({
      ...card,
      value: 'Loading...'
    }));
    
    return (
      <div data-testid={`${dataTestId}-statistics`}>
        <SectionKpiCards cards={loadingCards} />
      </div>
    );
  }

  return (
    <div data-testid={`${dataTestId}-statistics`}>
      <SectionKpiCards cards={kpiCards} />
    </div>
  );
};

export default HeadcountStatistics; 