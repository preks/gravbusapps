import React, { useState } from 'react';
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
import { useEquityInvestmentIntegration, useEquityChartData } from './hooks';
import { formatCurrency, formatNumber, formatPercentage } from './utils';
import { EquityTimelineCharts, EquityAnalyticsCharts, EquityDistributionCharts } from './components';

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport';
  const [activeTab, setActiveTab] = useState('overview');
  
  const { equityInvestments, kpis, isLoading, error, refetch } = useEquityInvestmentIntegration(props);
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