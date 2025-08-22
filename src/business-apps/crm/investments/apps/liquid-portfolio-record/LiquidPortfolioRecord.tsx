import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system';

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  useGetLiquidFundPortfolios,
  useGetLiquidFundPortfolioReports 
} from '../investment-management/views/investment-view/queries/LiquidPortfolioQueries';
import {
  LiquidFundPortfolioResponse,
  LiquidFundPortfolioReportResponse
} from '../investment-management/views/investment-view/types/LiquidPortfolioTypes';
import { TrendingUpIcon, ArrowLeftIcon, InfoIcon } from 'lucide-react';
import LiquidPortfolioReports from '../investment-management/views/investment-view/components/LiquidPortfolioReports';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

export interface LiquidPortfolioRecordProps extends BusinessAppContextProps {}

const LiquidPortfolioRecord: React.FC<LiquidPortfolioRecordProps> = ({
  accessToken,
  userInfo
}) => {
  const [portfolio, setPortfolio] = useState<LiquidFundPortfolioResponse | null>(null);
  const [latestReport, setLatestReport] = useState<LiquidFundPortfolioReportResponse | null>(null);
  const [historicalReports, setHistoricalReports] = useState<LiquidFundPortfolioReportResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Get portfolio ID from URL parameters
  const getPortfolioIdFromUrl = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('portfolioId');
  };

  const portfolioId = getPortfolioIdFromUrl();

  const { fetchLiquidFundPortfolioById } = useGetLiquidFundPortfolios({ accessToken, userInfo });
  const { fetchLiquidFundPortfolioReports } = useGetLiquidFundPortfolioReports({ accessToken, userInfo });

  useEffect(() => {
    if (portfolioId) {
      loadPortfolioDetails();
    } else {
      setError('Portfolio ID not found in URL');
      setIsLoading(false);
    }
  }, [portfolioId]);

  const loadPortfolioDetails = async () => {
    if (!portfolioId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch portfolio details
      const portfolioData = await fetchLiquidFundPortfolioById(portfolioId);
      setPortfolio(portfolioData);

      // Fetch reports for this portfolio (latest for performance + historical for chart)
      const [latestReportData, allReportsData] = await Promise.all([
        fetchLiquidFundPortfolioReports({
        where: {
          liquidFundPortfolioId: { _eq: portfolioId }
        },
        orderBy: [{ reportDate: 'DESC' }],
        limit: 1
        }),
        fetchLiquidFundPortfolioReports({
          where: {
            liquidFundPortfolioId: { _eq: portfolioId }
          },
          orderBy: [{ reportDate: 'ASC' }],
          limit: 50 // Get last 50 reports for chart
        })
      ]);

      if (latestReportData.length > 0) {
        setLatestReport(latestReportData[0]);
      }
      
      setHistoricalReports(allReportsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio details');
      console.error('Error loading portfolio details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currencyRef: string): string => {
    const currency = currencyRef?.split(':').pop() || 'EUR';
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
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusBadge = (endDate: string) => {
    if (!endDate) return <Badge variant="success">Active</Badge>;
    const end = new Date(endDate);
    const now = new Date();
    return end > now ? <Badge variant="success">Active</Badge> : <Badge variant="default">Matured</Badge>;
  };

  const getPerformanceBadge = (changeAmount: number, yieldPercent: number) => {
    const isPositive = changeAmount >= 0;
    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className={`gba:font-semibold ${isPositive ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
          {isPositive ? '+' : ''}{formatCurrency(changeAmount, portfolio?.currencyRef || 'Currency:v1:EUR')}
        </span>
        <span className={`gba:text-sm ${isPositive ? 'gba:text-green-500' : 'gba:text-red-500'}`}>
          ({formatPercentage(yieldPercent)})
        </span>
      </div>
    );
  };

  const handleGoBack = () => {
    const backUrl = buildPlatformUrl('/platform/irm/investment-relations', {
      view: 'investments',
      subView: 'liquid-portfolio'
    });
    navigateTo(backUrl);
  };

  // Prepare chart data from historical reports
  const prepareChartData = () => {
    return historicalReports.map(report => ({
      date: formatDate(report.reportDate),
      marketValue: report.closeMarketValueAmount,
      compoundYield: report.timeWeightCompoundYieldPercent,
      reportDate: report.reportDate
    })).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  };

  const chartData = prepareChartData();

  if (isLoading) {
    return (
      <div className="gba:min-h-screen gba:bg-gray-50 gba:p-6">
        <div className="gba:max-w-7xl gba:mx-auto">
          <div className="gba:mb-6">
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Liquid Portfolio Details</h1>
            <p className="gba:text-gray-600">Loading portfolio information...</p>
          </div>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-500"></div>
        </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:min-h-screen gba:bg-gray-50 gba:p-6">
        <div className="gba:max-w-7xl gba:mx-auto">
          <div className="gba:mb-6">
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Liquid Portfolio Details</h1>
            <p className="gba:text-gray-600">Error loading portfolio information</p>
          </div>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:space-y-4">
          <InfoIcon className="gba:h-12 gba:w-12 gba:text-red-500" />
          <p className="gba:text-red-600 gba:text-center">{error}</p>
          <div className="gba:flex gba:gap-2">
            <Button onClick={loadPortfolioDetails} variant="outline" size="sm">
              Retry
            </Button>
            <Button onClick={handleGoBack} variant="default" size="sm">
              <ArrowLeftIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              Back to List
            </Button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="gba:min-h-screen gba:bg-gray-50 gba:p-6">
        <div className="gba:max-w-7xl gba:mx-auto">
          <div className="gba:mb-6">
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Liquid Portfolio Details</h1>
            <p className="gba:text-gray-600">Portfolio not found</p>
          </div>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:space-y-4">
          <InfoIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
          <p className="gba:text-gray-500 gba:text-center">Portfolio not found</p>
          <Button onClick={handleGoBack} variant="default" size="sm">
            <ArrowLeftIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            Back to List
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="liquid-portfolio-record" className="gba:min-h-screen gba:bg-white">
      {/* Header Section */}
      <div className="gba:border-b gba:border-gray-200 gba:bg-white">
        <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:py-4">
          {/* Back Button */}
          <div className="gba:mb-4">
            <Button onClick={handleGoBack} variant="ghost" size="sm" className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600 hover:gba:text-gray-900">
              <ArrowLeftIcon className="gba:h-4 gba:w-4" />
              Back to Liquid Portfolios
            </Button>
          </div>

          {/* Title and Actions */}
          <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-1">
                {portfolio.proprietorName}
              </h1>
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
                <span>Investment Group: {portfolio.investmentGroup?.value || 'N/A'}</span>
                <span>•</span>
                <span>Type: {portfolio.investmentType?.value || 'N/A'}</span>
                <span>•</span>
                <span>Owner: Portfolio Manager</span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </div>
          
          {/* Main Tabs */}
          <div className="gba:border-b gba:border-gray-200">
            <nav className="gba:-mb-px gba:flex gba:space-x-8">
              <button 
                className={`gba:border-transparent gba:py-2 gba:px-1 gba:text-sm gba:font-medium gba:border-b-2 ${
                  activeTab === 'overview' 
                    ? 'gba:text-blue-600 gba:border-blue-600' 
                    : 'gba:text-gray-500 hover:gba:text-gray-700 hover:gba:border-gray-300'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`gba:border-transparent gba:py-2 gba:px-1 gba:text-sm gba:font-medium gba:border-b-2 ${
                  activeTab === 'reports' 
                    ? 'gba:text-blue-600 gba:border-blue-600' 
                    : 'gba:text-gray-500 hover:gba:text-gray-700 hover:gba:border-gray-300'
                }`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            </nav>
          </div>
        </div>
      </div>

            {/* Main Content */}
      <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:py-6">
        
        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="gba:space-y-8">
            {/* Two-column layout */}
            <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">

              {/* Left Column - Portfolio Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Information</CardTitle>
                  <CardDescription>
                    Fundamental portfolio details and identifiers
                  </CardDescription>
                </CardHeader>
                <CardContent className="gba:space-y-4">
                  <div className="gba:space-y-4">
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Proprietor Name</label>
                      <p className="gba:text-base gba:font-semibold gba:text-gray-900">{portfolio.proprietorName}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Deposit Name</label>
                      <p className="gba:text-base gba:font-semibold gba:text-gray-900">{portfolio.depositName}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">ISIN</label>
                      <p className="gba:font-mono gba:text-sm gba:text-gray-700">{portfolio.isin}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Portfolio Code</label>
                      <p className="gba:font-mono gba:text-sm gba:text-gray-700">{portfolio.portfolioCode}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Portfolio Number</label>
                      <p className="gba:font-mono gba:text-sm gba:text-gray-700">{portfolio.portfolioNumber}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Investment Group</label>
                      <p className="gba:text-sm gba:text-gray-700">{portfolio.investmentGroup?.value || portfolio.investmentGroupRef}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Investment Type</label>
                      <p className="gba:text-sm gba:text-gray-700">{portfolio.investmentType?.value || portfolio.investmentTypeRef}</p>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Currency</label>
                      <Badge variant="outline">{portfolio.currencyRef?.split(':').pop() || 'EUR'}</Badge>
                    </div>
                    <div>
                      <label className="gba:text-sm gba:font-medium gba:text-gray-500">Status</label>
                      <div>{getStatusBadge(portfolio.portfolioEndDate)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Performance Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Information</CardTitle>
                  <CardDescription>
                    {latestReport 
                      ? `Latest performance metrics from ${formatDate(latestReport.reportDate)}`
                      : 'No performance data available'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="gba:space-y-4">
                  {latestReport ? (
                    <div className="gba:space-y-4">
                      <div>
                        <label className="gba:text-sm gba:font-medium gba:text-gray-500">Market Value</label>
                        <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                          {formatCurrency(latestReport.closeMarketValueAmount, portfolio.currencyRef)}
                        </p>
                      </div>
                      <div>
                        <label className="gba:text-sm gba:font-medium gba:text-gray-500">Performance</label>
                        <div>
                          {getPerformanceBadge(latestReport.changeMarketValueAmount, latestReport.timeWeightCompoundYieldPercent)}
                        </div>
                      </div>
                      <div>
                        <label className="gba:text-sm gba:font-medium gba:text-gray-500">Cash Flow</label>
                        <p className="gba:text-base gba:font-semibold gba:text-gray-900">
                          {formatCurrency(latestReport.cashFlowAmount, portfolio.currencyRef)}
                        </p>
                      </div>
                      <div>
                        <label className="gba:text-sm gba:font-medium gba:text-gray-500">Net Income</label>
                        <p className="gba:text-base gba:font-semibold gba:text-gray-900">
                          {formatCurrency(latestReport.netIncomeAmount, portfolio.currencyRef)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="gba:text-center gba:py-8 gba:text-gray-500">
                      <TrendingUpIcon className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
                      <p>No performance reports available for this portfolio</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Performance Trend</CardTitle>
                <CardDescription>
                  Market value evolution (bars) and compound yield performance (line) over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="gba:relative">
                    {/* Axis Labels */}
                    <div className="gba:absolute gba:left-0 gba:top-1/2 gba:-translate-y-1/2 gba:-rotate-90 gba:text-sm gba:text-gray-600 gba:font-medium gba:z-10">
                      Market Value
                    </div>
                    <div className="gba:absolute gba:right-0 gba:top-1/2 gba:-translate-y-1/2 gba:rotate-90 gba:text-sm gba:text-gray-600 gba:font-medium gba:z-10">
                      Compound Yield %
                    </div>
                    <div className="gba:h-96 gba:px-8">
                      <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          fontSize={12}
                        />
                        <YAxis 
                          yAxisId="marketValue"
                          orientation="left"
                          width={60}
                        />
                        <YAxis 
                          yAxisId="yield"
                          orientation="right"
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'marketValue') {
                              return [formatCurrency(Number(value), portfolio?.currencyRef || 'Currency:v1:EUR'), 'Market Value'];
                            }
                            if (name === 'compoundYield') {
                              return [`${Number(value).toFixed(2)}%`, 'Compound Yield'];
                            }
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Bar 
                          yAxisId="marketValue"
                          dataKey="marketValue" 
                          fill="#3b82f6" 
                          fillOpacity={0.6}
                          name="marketValue"
                          maxBarSize={30}
                        />
                        <Line 
                          yAxisId="yield"
                          type="monotone" 
                          dataKey="compoundYield" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          name="compoundYield"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-gray-500">
                    <TrendingUpIcon className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
                    <p>No historical data available for chart visualization</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

                {/* Reports Tab Content */}
        {activeTab === 'reports' && portfolioId && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Historical Reports</h3>
            </div>
            <LiquidPortfolioReports
              portfolioId={portfolioId}
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid="liquid-portfolio-record-reports"
            />
          </div>
        )}
        </div>
    </div>
  );
};

export default LiquidPortfolioRecord;