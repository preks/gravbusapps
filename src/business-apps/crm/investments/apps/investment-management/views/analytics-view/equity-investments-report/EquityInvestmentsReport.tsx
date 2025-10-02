import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@newwork/nw-design-system';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system';
import { Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Spinner } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { TrendingUp, BarChart, PieChart } from 'lucide-react';
import { WidgetGroup } from '@/components/widget-group';
import { DollarCircleOutlined, BankOutlined, RiseOutlined, TeamOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, EquityInvestment } from '@/common/data/investment';

// Extended Investment type that includes specialization fields from GraphQL queries
interface InvestmentWithSpecializations extends Investment {
  equityInvestment?: EquityInvestment[];
  realEstateInvestment?: any[];
  liquidFundInvestment?: any[];
  bookValue?: number;
  investmentRole?: Array<{
    id: string;
    displayOrder?: number;
    investmentRole?: {
      value?: string;
    };
  }>;
}
import { useEquityChartData, useEquityKPIIntegration } from './hooks';
import { 
  calculateChange,
  formatCurrency,
  extractCurrencyCode,
  getInvestmentStatusColor,
  getRiskLevelColor,
  getInvestmentRoleColor
} from '../shared/utils';
import type { EquityInvestmentSummary } from '../shared/types';
import { EquityTimelineCharts, EquityAnalyticsCharts, EquityDistributionCharts } from './components';

// Legacy interface - kept for compatibility but not used for KPIs anymore
export interface EquityInvestmentKPIs {
  totalEquityValue: number;
  averageCompanyValuation: number;
  totalEbitda: number;
  numberOfEquityInvestments: number;
}

// Helper function to safely extract currency code from CatalogEntry or string
const safeCurrencyExtraction = (currency: any): string => {
  if (!currency) return 'EUR';
  
  if (typeof currency === 'object') {
    // Handle CatalogEntry: try code first, then value
    const currencyStr = currency.code || currency.value;
    return extractCurrencyCode(currencyStr || 'EUR');
  }
  
  // Handle string values
  return extractCurrencyCode(currency);
};

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport';
  const [activeTab, setActiveTab] = useState('distribution');
  
  const [equityInvestments, setEquityInvestments] = useState<EquityInvestmentSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Use the new KPI integration hook for real GraphQL aggregate queries
  const { current: kpis, previous: previousKpis, isLoading: kpiLoading, error: kpiError, refetch: refetchKpis } = useEquityKPIIntegration(props);
  
  const { fetchInvestments } = useGetInvestments(props);

  // Combined loading and error states
  const isLoading = dataLoading || kpiLoading;
  const error = dataError || kpiError;

  // Transform equity data
  const transformEquityData = useCallback((investments: InvestmentWithSpecializations[]): EquityInvestmentSummary[] => {
    return investments
      .filter(investment => {
        // Include investments that have equityInvestment data OR are equity-related by investment type
        const hasEquityData = investment.equityInvestment && Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0;
        const isEquityType = (investment.investmentType?.value ?? '').toLowerCase().includes('equity') || 
                           (investment.investmentGroup?.value ?? '').toLowerCase().includes('equity');
        return hasEquityData || isEquityType;
      })
      .map(investment => {
        // Get the first equity investment or create a default one
        const equityInvestment = (investment.equityInvestment && investment.equityInvestment.length > 0) 
          ? investment.equityInvestment[0] 
          : { id: investment.id, ebitdaAmount: 0, marketValue: 0, turnoverAmount: 0 };
        
        const bookValue = investment.bookValue || 0;
        const marketValue = investment.investmentMarketValue || bookValue;
        const roi = bookValue > 0 ? ((marketValue - bookValue) / bookValue) * 100 : 0;
        
        return {
          id: equityInvestment.id,
          investment,
          equityInvestment,
          displayName: investment.displayName || investment.name || 'Unknown Equity',
          statusColor: getInvestmentStatusColor(investment.investmentStatus?.value || ''),
          stakeTypeColor: getInvestmentRoleColor(investment.investmentStakeType?.value || ''),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
          currencyCode: safeCurrencyExtraction(investment.currency),
          roi,
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          ebitdaMargin: (equityInvestment as any).ebitdaMargin || 0,
          roleColor: getInvestmentRoleColor(
            (Array.isArray(investment.investmentRole) && investment.investmentRole.length > 0)
              ? investment.investmentRole[0]?.investmentRole?.value || ''
              : ''
          )
        };
      });
  }, []);

  // Load equity investment data for chart display
  const loadData = useCallback(async () => {
    if (!props.accessToken) {
      setDataError('Access token not available');
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setDataError(null);
    
    try {
      const result = await fetchInvestments();
      const enhancedEquityInvestments = transformEquityData(result.Investment as InvestmentWithSpecializations[]);
      setEquityInvestments(enhancedEquityInvestments);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDataLoading(false);
    }
  }, [props.accessToken, fetchInvestments, transformEquityData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      loadData();
    }
  }, [props.accessToken, loadData]);

  // Combined refetch function for error retry
  const refetch = useCallback(async () => {
    await Promise.all([loadData(), refetchKpis()]);
  }, [loadData, refetchKpis]);
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
    statusData,
    stakeTypeData,
    investmentTypeData,
    // Enhanced chart data
    equityTimelineData,
    stakeVsInvestmentAmountData,
    roleInvestmentAmountData,
    concentrationByRoleData,
    topCompaniesByValuationData
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
          <Badge variant="secondary">{kpis?.totalInvestments || 0} {getTranslationFromI18nKeyAndLabel('equity.investments.items', 'equity investments')}</Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="gba:mb-6">
        <WidgetGroup
          widgets={[
            {
              key: "total-investments",
              title: getTranslationFromI18nKeyAndLabel('kpi.totalInvestments', 'Total Investments'),
              value: kpis.totalInvestments,
              prefix: <TeamOutlined />,
              color: "var(--nw-color-primary-500)",
              span: { xs: 24, sm: 12, lg: 6 },
              description: "Total number of equity investments",
              trend: {
                value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
                positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
                description: "vs 7 days ago",
              },
            },
            {
              key: "total-amount-invested",
              title: getTranslationFromI18nKeyAndLabel('kpi.totalAmountInvested', 'Total Amount Invested'),
              value: formatCurrency(kpis.totalAmountInvested),
              prefix: <DollarCircleOutlined />,
              color: "var(--nw-color-success-500)",
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: "Sum of all equity investment amounts",
              trend: {
                value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
                positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
                description: "vs 7 days ago",
              },
            },
            {
              key: "total-market-value",
              title: getTranslationFromI18nKeyAndLabel('kpi.totalMarketValue', 'Total Market Value'),
              value: formatCurrency(kpis.totalMarketValue),
              prefix: <RiseOutlined />,
              color: "var(--nw-color-warning-500)",
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: "Current total market value of equity positions",
              trend: {
                value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
                positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
                description: "vs 7 days ago",
              },
            },
            {
              key: "average-company-valuation",
              title: getTranslationFromI18nKeyAndLabel('kpi.averageCompanyValuation', 'Average Company Valuation'),
              value: formatCurrency(kpis.averageCompanyValuation),
              prefix: <BankOutlined />,
              color: "var(--nw-color-purple-500)",
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: "Average valuation across all companies",
              trend: {
                value: calculateChange(kpis.averageCompanyValuation, previousKpis.averageCompanyValuation).value,
                positive: calculateChange(kpis.averageCompanyValuation, previousKpis.averageCompanyValuation).positive,
                description: "vs 7 days ago",
              },
            },
          ]}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={refetch}
          data-testid={formatDataTestId(prefixDataTestId, 'KPICards')}
        />
      </div>

      {/* Tabbed Charts */}
      <div className="gba:bg-white gba:rounded-lg gba:p-4">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          data-testid={formatDataTestId(prefixDataTestId, 'ChartTabs')}
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
            <TabsTrigger value="distribution" className="gba:flex gba:items-center gba:gap-2">
              <PieChart className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gba:flex gba:items-center gba:gap-2">
              <TrendingUp className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gba:flex gba:items-center gba:gap-2">
              <BarChart className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('tab.analytics', 'Performance Analysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="gba:mt-6">
            <div className="gba:space-y-6 gba:w-full">
              <EquityDistributionCharts
                roleData={roleData}
                statusData={statusData}
                stakeTypeData={stakeTypeData}
                investmentTypeData={investmentTypeData}
                rawInvestments={equityInvestments}
              />
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
            <div className="gba:space-y-6">
              <EquityAnalyticsCharts
                stakeVsInvestmentAmountData={stakeVsInvestmentAmountData}
                roleInvestmentAmountData={roleInvestmentAmountData}
                concentrationByRoleData={concentrationByRoleData}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EquityInvestmentsReport; 