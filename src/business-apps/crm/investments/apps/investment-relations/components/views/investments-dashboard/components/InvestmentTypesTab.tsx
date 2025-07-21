import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { BarChart3, Home, Briefcase, Banknote, DollarSign } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { MetricsCards } from './';
import { useInvestmentDataIntegration } from '../hooks/useInvestmentDataIntegration';

const getIconComponent = (iconName: string) => {
  const icons = {
    BarChart3,
    Home, 
    Briefcase,
    Banknote
  };
  return icons[iconName as keyof typeof icons] || BarChart3;
};

interface InvestmentTypesTabProps extends BusinessAppContextProps {
  onNavigateToInvestmentType: (investmentType: string) => void;
}

const InvestmentTypesTab: React.FC<InvestmentTypesTabProps> = (props) => {
  const { onNavigateToInvestmentType } = props;
  const { 
    metrics, 
    typeMetrics, 
    isLoading, 
    error, 
    refetch 
  } = useInvestmentDataIntegration(props);

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="investment-types-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="investment-types-error">
        <AlertTitle>Error Loading Investment Types Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <button className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded" onClick={refetch}>
          Retry
        </button>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-types-content">
      {/* Key Metrics Cards */}
      <div className="gba:mb-8">
        <MetricsCards metrics={metrics} />
      </div>

      {/* Investment Breakdown Overview */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Investment Breakdown Overview</h2>
          <span className="gba:text-sm gba:text-gray-600">
            Capital allocation across {metrics?.investmentTypes || 0} investment types
          </span>
        </div>

        <div className="gba:space-y-6">
          {/* Investment Types Grid */}
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {isLoading ? (
              <div className="gba:col-span-full gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="gba:col-span-full">
                <Alert variant="destructive">
                  <AlertTitle>Error Loading Investment Types</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <Button size="sm" onClick={refetch}>
                    Retry
                  </Button>
                </Alert>
              </div>
            ) : (
              typeMetrics.map((type) => (
                <Card key={type.name} className="gba:h-full">
                  <CardHeader>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div 
                        className="gba:p-2 gba:bg-blue-100 gba:rounded-lg gba:cursor-pointer gba:transition-transform gba:hover:scale-105"
                        onClick={() => {
                          const subtabMap: { [key: string]: string } = {
                            'Equity': 'equity',
                            'Real Estate': 'real-estate', 
                            'Private Equity': 'private-equity',
                            'Liquid Funds': 'liquid-funds'
                          };
                          const subtab = subtabMap[type.name] || type.name.toLowerCase().replace(' ', '-');
                          onNavigateToInvestmentType(subtab);
                        }}
                        data-testid={`investment-type-icon-${type.name.toLowerCase().replace(' ', '-')}`}
                      >
                        {type.icon === 'BarChart3' && <BarChart3 className="gba:w-6 gba:h-6 gba:text-blue-600" />}
                        {type.icon === 'Home' && <Home className="gba:w-6 gba:h-6 gba:text-blue-600" />}
                        {type.icon === 'Briefcase' && <Briefcase className="gba:w-6 gba:h-6 gba:text-blue-600" />}
                        {type.icon === 'Banknote' && <Banknote className="gba:w-6 gba:h-6 gba:text-blue-600" />}
                      </div>
                      <div>
                        <CardTitle>{type.name}</CardTitle>
                        <p className="gba:text-sm gba:text-gray-600">{type.investments} investments</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="gba:p-6">
                    <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-4">
                      <div>
                        <p className="gba:text-sm gba:text-gray-600">Total Invested</p>
                        <p className="gba:text-lg gba:font-semibold">{type.totalInvested}</p>
                      </div>
                      <div>
                        <p className="gba:text-sm gba:text-gray-600">Book Value</p>
                        <p className="gba:text-lg gba:font-semibold">{type.bookValue}</p>
                      </div>
                    </div>

                    <div className="gba:mb-4">
                      <div className="gba:flex gba:justify-between gba:items-center">
                        <p className="gba:text-sm gba:text-gray-600">Avg. ROI</p>
                        <p className={`gba:text-lg gba:font-semibold ${type.roiColor}`}>{type.avgROI}</p>
                      </div>
                    </div>

                    <div className="gba:space-y-2">
                      <p className="gba:text-sm gba:font-medium gba:text-gray-700">Sub-types</p>
                      {type.subTypes.map((subType) => (
                        <div key={subType.name} className="gba:flex gba:justify-between gba:items-center">
                          <p className="gba:text-sm gba:text-gray-600">{subType.name}</p>
                          <div className="gba:text-right">
                            <p className="gba:text-sm gba:font-medium">{subType.amount}</p>
                            <p className="gba:text-xs gba:text-gray-500">{subType.percentage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentTypesTab; 