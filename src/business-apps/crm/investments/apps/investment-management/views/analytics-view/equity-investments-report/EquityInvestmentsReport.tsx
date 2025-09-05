import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { Button } from '@newwork/nw-design-system';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system';
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { Plus, DollarSign, Building, TrendingUp, Users, BarChart, PieChart, Activity, Briefcase } from 'lucide-react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, EquityInvestment } from '@/common/data/investment';
import { useEquityChartData } from './hooks';
import { formatCurrency, formatNumber, formatPercentage } from './utils';
import { EquityTimelineCharts, EquityAnalyticsCharts, EquityDistributionCharts } from './components';

// Equity Investment Summary interface (moved from separate hook)
export interface EquityInvestmentSummary {
  id: string;
  investment: Investment;
  equityInvestment?: EquityInvestment;
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  roi: number;
  isActive: boolean;
  ebitdaMargin: number;
  roleColor: string;
}

export interface EquityInvestmentKPIs {
  totalEquityValue: number;
  averageCompanyValuation: number;
  totalEbitda: number;
  numberOfEquityInvestments: number;
}

// Utility functions (moved from separate hook)
const extractCurrencyCode = (currency: any): string => {
  if (!currency) return 'EUR';
  
  let currencyValue = currency.description || currency.code || currency.id || currency.name || currency;
  
  if (typeof currencyValue === 'string') {
    if (currencyValue.includes(':')) {
      const parts = currencyValue.split(':');
      return parts[parts.length - 1] || 'EUR';
    }
    
    if (currencyValue.length === 3) {
      return currencyValue.toUpperCase();
    }
  }
  
  return 'EUR';
};

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active': return 'green';
    case 'inactive': return 'red';
    case 'pending': return 'orange';
    default: return 'blue';
  }
};

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'green';
    case 'medium': return 'orange';
    case 'high': return 'red';
    default: return 'blue';
  }
};

const getRoleColor = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'lead': return 'purple';
    case 'co-investor': return 'blue';
    case 'minority': return 'green';
    default: return 'gray';
  }
};

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport';
  const [activeTab, setActiveTab] = useState('overview');
  
  const [equityInvestments, setEquityInvestments] = useState<EquityInvestmentSummary[]>([]);
  const [kpis, setKpis] = useState<EquityInvestmentKPIs>({
    totalEquityValue: 0,
    averageCompanyValuation: 0,
    totalEbitda: 0,
    numberOfEquityInvestments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(props);

  // Transform equity data
  const transformEquityData = useCallback((investments: Investment[]): EquityInvestmentSummary[] => {
    return investments
      .filter(investment => investment.equityInvestment && Object.keys(investment.equityInvestment).length > 0)
      .map(investment => {
        const equityInvestment = investment.equityInvestment!;
        const bookValue = investment.bookValue || 0;
        const marketValue = investment.investmentMarketValue || bookValue;
        const roi = bookValue > 0 ? ((marketValue - bookValue) / bookValue) * 100 : 0;
        
        return {
          id: equityInvestment.id,
          investment,
          equityInvestment,
          displayName: investment.displayName || investment.name || equityInvestment.companyName || 'Unknown Equity',
          statusColor: getStatusColor(investment.investmentStatus?.value || ''),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
          currencyCode: extractCurrencyCode(investment.currency),
          roi,
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          ebitdaMargin: equityInvestment.ebitdaMargin || 0,
          roleColor: getRoleColor(equityInvestment.investmentRole?.value || '')
        };
      });
  }, []);

  // Calculate KPIs
  const calculateKPIs = useCallback((equityInvestments: EquityInvestmentSummary[]): EquityInvestmentKPIs => {
    const totalEquityValue = equityInvestments.reduce((sum, equity) => 
      sum + (equity.investment.investmentMarketValue || equity.investment.bookValue || 0), 0
    );
    
    const totalCompanyValuation = equityInvestments.reduce((sum, equity) => 
      sum + (equity.equityInvestment?.companyValuation || 0), 0
    );
    const averageCompanyValuation = equityInvestments.length > 0 ? totalCompanyValuation / equityInvestments.length : 0;
    
    const totalEbitda = equityInvestments.reduce((sum, equity) => 
      sum + (equity.equityInvestment?.ebitda || 0), 0
    );

    return {
      totalEquityValue,
      averageCompanyValuation,
      totalEbitda,
      numberOfEquityInvestments: equityInvestments.length
    };
  }, []);

  // Load data function
  const loadData = useCallback(async () => {
    if (!props.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestments();
      const enhancedEquityInvestments = transformEquityData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedEquityInvestments);
      
      setEquityInvestments(enhancedEquityInvestments);
      setKpis(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [props.accessToken, fetchInvestments, transformEquityData, calculateKPIs]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      loadData();
    }
  }, [props.accessToken, loadData]);

  // Refetch function for error retry
  const refetch = loadData;
  const chartData = useEquityChartData(equityInvestments);

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

  const {
    // Original chart data
    roleData,
    valuationEbitdaData,
    ebitdaMarginData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    roiData,
    // Enhanced chart data
    equityTimelineData,
    stakeVsValuationData,
    ebitdaValuationAnalysisData,
    rolePerformanceData,
    concentrationByRoleData,
    topCompaniesByValuationData,
    valuationDistributionData
  } = chartData;

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('equity.investments.title', 'Equity Investments Report')}
          </h3>
          <Badge variant="secondary">{equityInvestments.length} {getTranslationFromI18nKeyAndLabel('equity.investments.items', 'equity investments')}</Badge>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            variant="default"
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel('button.addEquityInvestment', 'Add Equity Investment')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4 gba:mb-6 gba:w-full">
        <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEquityValue')}>
          <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
            <div className="gba:p-3 gba:rounded-lg">
              <DollarSign className="gba:h-6 gba:w-6" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('kpi.totalEquityValue', 'Total Equity Value')}
              </p>
              <p className="gba:text-2xl gba:font-bold">
                {formatCurrency(kpis.totalEquityValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageCompanyValuation')}>
          <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
            <div className="gba:p-3 gba:rounded-lg">
              <Building className="gba:h-6 gba:w-6" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('kpi.averageCompanyValuation', 'Average Company Valuation')}
              </p>
              <p className="gba:text-2xl gba:font-bold">
                {formatCurrency(kpis.averageCompanyValuation)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEbitda')}>
          <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
            <div className="gba:p-3 gba:rounded-lg">
              <TrendingUp className="gba:h-6 gba:w-6" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('kpi.totalEbitda', 'Total EBITDA')}
              </p>
              <p className="gba:text-2xl gba:font-bold">
                {formatCurrency(kpis.totalEbitda)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid={formatDataTestId(prefixDataTestId, 'KPICard-NumberOfEquityInvestments')}>
          <CardContent className="gba:flex gba:items-center gba:gap-3 gba:p-6">
            <div className="gba:p-3 gba:rounded-lg">
              <Users className="gba:h-6 gba:w-6" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('kpi.numberOfEquityInvestments', 'Number of Equity Investments')}
              </p>
              <p className="gba:text-2xl gba:font-bold">
                {formatNumber(kpis.numberOfEquityInvestments)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Charts */}
      <div className="gba:bg-white gba:rounded-lg gba:p-4">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          data-testid={formatDataTestId(prefixDataTestId, 'ChartTabs')}
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
            <TabsTrigger value="overview" className="gba:flex gba:items-center gba:gap-2">
              <BarChart className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gba:flex gba:items-center gba:gap-2">
              <TrendingUp className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gba:flex gba:items-center gba:gap-2">
              <Briefcase className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.analytics', 'Performance Analytics')}
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gba:flex gba:items-center gba:gap-2">
              <PieChart className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:mt-6">
            <div className="gba:p-6 gba:text-center">
              <p>Overview content coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="gba:mt-6">
            <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:w-full">
              <EquityTimelineCharts
                equityTimelineData={equityTimelineData}
                topCompaniesByValuationData={topCompaniesByValuationData}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="gba:mt-6">
            <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6 gba:w-full">
              <EquityAnalyticsCharts
                stakeVsValuationData={stakeVsValuationData}
                ebitdaValuationAnalysisData={ebitdaValuationAnalysisData}
                rolePerformanceData={rolePerformanceData}
                concentrationByRoleData={concentrationByRoleData}
                valuationDistributionData={valuationDistributionData}
              />
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="gba:mt-6">
            <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:w-full">
              <EquityDistributionCharts
                roleData={roleData}
                statusData={statusData}
                phaseData={phaseData}
                riskLevelData={riskLevelData}
                currencyData={currencyData}
                roiData={roiData}
                ebitdaMarginData={ebitdaMarginData}
                valuationEbitdaData={valuationEbitdaData}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EquityInvestmentsReport; 