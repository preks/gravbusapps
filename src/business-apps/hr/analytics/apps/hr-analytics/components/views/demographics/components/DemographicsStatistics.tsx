import React from 'react';
import { SectionKpiCards, KpiCardData } from '@newwork/nw-design-system';
import type { DemographicsStatistics } from '../../../../hooks/useDemographicsDataIntegration';

interface DemographicsStatisticsProps {
  statistics: DemographicsStatistics;
  isLoading: boolean;
  dataTestId: string;
}

const DemographicsStatistics: React.FC<DemographicsStatisticsProps> = ({
  statistics,
  isLoading,
  dataTestId
}) => {
  const kpiCards: KpiCardData[] = [
    {
      id: 'gender-diversity',
      title: 'Gender Diversity',
      value: `${statistics.genderDiversity.toFixed(1)}%`,
      icon: 'users',
      iconColor: '#eb2f96',
      footer: 'Gender distribution balance'
    },
    {
      id: 'common-gender',
      title: 'Most Common Gender',
      value: statistics.mostCommonGender || 'N/A',
      icon: 'users',
      iconColor: '#fa8c16',
      footer: 'Most frequent gender'
    },
    {
      id: 'average-age',
      title: 'Average Age',
      value: statistics.averageAge ? `${statistics.averageAge.toFixed(1)} years` : 'N/A',
      icon: 'calendar',
      iconColor: '#722ed1',
      footer: 'Average employee age'
    },
    {
      id: 'nationality-overview',
      title: 'Nationality Distribution',
      value: statistics.mostCommonNationality || 'N/A',
      icon: 'mail',
      iconColor: '#13c2c2',
      footer: `Most common • ${statistics.nationalityDiversity} different nationalities`
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

export default DemographicsStatistics; 