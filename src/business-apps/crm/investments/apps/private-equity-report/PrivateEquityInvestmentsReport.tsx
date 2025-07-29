import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { Button } from '@newwork/nw-design-system';
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { Plus } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { usePrivateEquityInvestmentIntegration } from './hooks/usePrivateEquityInvestmentIntegration';
import { usePrivateEquityChartData } from './hooks/usePrivateEquityChartData';
import { PrivateEquityKPICards, PrivateEquityCharts } from './components';

// Typography no longer needed with design system

interface PrivateEquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const PrivateEquityInvestmentsReport: React.FC<PrivateEquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'PrivateEquityInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  
  const { privateEquityInvestments, kpis, isLoading, error, refetch } = usePrivateEquityInvestmentIntegration(props);
  const chartData = usePrivateEquityChartData(privateEquityInvestments);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  if (isLoading) {
    return (
      <div
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        data-testid={formatDataTestId(prefixDataTestId, 'Error')}
        variant="destructive"
      >
        <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.loading', 'Error Loading Data')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <div className="gba:mt-2">
          <Button variant="default" size="sm" onClick={() => refetch()}>
            {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('privateEquity.investments.title', 'Private Equity Investments Report')}
          </h3>
          <Badge variant="secondary">{privateEquityInvestments.length} {getTranslationFromI18nKeyAndLabel('privateEquity.investments.items', 'PE investments')}</Badge>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            variant="default"
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('button.addPrivateEquityInvestment', 'Add PE Investment')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <PrivateEquityKPICards 
        kpis={kpis} 
        prefixDataTestId={prefixDataTestId} 
      />

      {/* Search */}
      <div className="gba:mb-6">
        <div className="gba:w-80">
          <DebouncedInput
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
            placeholder={getTranslationFromI18nKeyAndLabel('placeholder.searchPrivateEquityInvestments', 'Search private equity investments...')}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Charts */}
      <PrivateEquityCharts chartData={chartData} />
    </div>
  );
};

export default PrivateEquityInvestmentsReport; 