import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  FundProjectionScreenOutlined,
  CalendarOutlined,
  StarOutlined,
  RiseOutlined
} from '@ant-design/icons';

interface ForecastData {
  monthlyTrends: {
    month: string;
    actualCreated: number;
    actualClosed: number;
    actualValue: number;
    actualClosedValue: number;
  }[];
  pipelineStats: {
    totalPipelineValue: number;
    totalOpportunities: number;
    riskAdjustedValue: number;
    averageWinChance: number;
  };
  quarterlyTrends: {
    quarter: string;
    currentQuarter: boolean;
    totalOpportunities: number;
    closedOpportunities: number;
    totalRevenue: number;
    closedRevenue: number;
    conversionRate: number;
  }[];
  topOpportunities: {
    id: string;
    name: string;
    currentWinChance: number;
    estimatedAmount: number;
    daysInPipeline: number;
    account?: string;
    status: 'high-confidence' | 'medium-confidence' | 'needs-attention';
  }[];
}

interface OpportunityForecastingInsightsProps extends BusinessAppContextProps {
  data?: any;
}

export const OpportunityForecastingInsights: React.FC<OpportunityForecastingInsightsProps> = ({ 
  accessToken
}) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forecastPeriod, setForecastPeriod] = useState<'quarterly' | 'monthly'>('quarterly');
  const graphqlClient = useGraphQLClient(accessToken);

  // Generate real data analysis based on historical opportunities
  const generateRealDataAnalysis = (opportunities: any[], historicalOpportunities: any[]): any => {
    const currentDate = new Date();
    
    // Calculate real monthly trends from historical data
    const monthlyTrends = [];
    for (let i = -5; i <= 0; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Filter opportunities created in this month
      const monthOpportunities = opportunities.filter(opp => {
        const oppDate = new Date(opp.createdAt);
        return oppDate >= monthStart && oppDate <= monthEnd;
      });
      
      // Filter opportunities closed in this month
      const monthClosed = historicalOpportunities.filter(opp => {
        const closeDate = new Date(opp.closeDate);
        return closeDate >= monthStart && closeDate <= monthEnd;
      });
      
      const totalValue = monthOpportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
      const closedValue = monthClosed.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
      
      monthlyTrends.push({
        month: monthKey,
        actualCreated: monthOpportunities.length,
        actualClosed: monthClosed.length,
        actualValue: totalValue,
        actualClosedValue: closedValue
      });
    }

    // Calculate quarterly trends (real data only)
    const quarterlyTrends = [];
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    const currentYear = currentDate.getFullYear();
    
    for (let i = -1; i <= 0; i++) {
      const quarterNum = ((currentQuarter - 1 + i) % 4) + 1;
      const year = currentYear + Math.floor((currentQuarter - 1 + i) / 4);
      const quarterStart = new Date(year, (quarterNum - 1) * 3, 1);
      const quarterEnd = new Date(year, quarterNum * 3, 0);
      
      const quarterOpportunities = opportunities.filter(opp => {
        const oppDate = new Date(opp.createdAt);
        return oppDate >= quarterStart && oppDate <= quarterEnd;
      });
      
      const quarterClosed = historicalOpportunities.filter(opp => {
        const closeDate = new Date(opp.closeDate);
        return closeDate >= quarterStart && closeDate <= quarterEnd;
      });
      
      const totalRevenue = quarterOpportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
      const closedRevenue = quarterClosed.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
      
      quarterlyTrends.push({
        quarter: `Q${quarterNum} ${year}`,
        currentQuarter: i === 0,
        totalOpportunities: quarterOpportunities.length,
        closedOpportunities: quarterClosed.length,
        totalRevenue,
        closedRevenue,
        conversionRate: quarterOpportunities.length > 0 ? Math.round((quarterClosed.length / quarterOpportunities.length) * 100) : 0
      });
    }

    // Real opportunity analysis (no predictions, just current data)
    const topOpportunities = opportunities
      .filter(opp => opp.winningChance && opp.winningChance > 50)
      .sort((a, b) => (b.winningChance || 0) - (a.winningChance || 0))
      .slice(0, 10)
      .map((opp: any) => {
        const daysInPipeline = Math.floor((currentDate.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: opp.id,
          name: opp.name,
          currentWinChance: opp.winningChance || 0,
          estimatedAmount: opp.estimatedAmount || 0,
          daysInPipeline,
          account: opp.account?.name,
          status: opp.winningChance >= 80 ? 'high-confidence' : 
                  opp.winningChance >= 60 ? 'medium-confidence' : 'needs-attention'
        };
      });

    return {
      monthlyTrends,
      pipelineStats: {
        totalPipelineValue: opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0),
        totalOpportunities: opportunities.length,
        riskAdjustedValue: Math.round(opportunities.reduce((sum: number, opp: any) => 
          sum + ((opp.estimatedAmount || 0) * ((opp.winningChance || 50) / 100)), 0)),
        averageWinChance: opportunities.length > 0 ? 
          Math.round(opportunities.reduce((sum: number, opp: any) => sum + (opp.winningChance || 0), 0) / opportunities.length) : 0
      },
      quarterlyTrends,
      topOpportunities
    };
  };

  useEffect(() => {
    const fetchForecastData = async () => {
      try {
        setIsLoading(true);
        
        const query = `
          query GetForecastingData(
            $activeWhere: OpportunityBoolExp
            $historicalWhere: OpportunityBoolExp
            $activeOrderBy: [OpportunityOrderBy!]
            $historicalOrderBy: [OpportunityOrderBy!]
            $activeLimit: Int
            $historicalLimit: Int
          ) {
            opportunities: Opportunity(
              where: $activeWhere
              orderBy: $activeOrderBy
              limit: $activeLimit
            ) {
              id
              name
              estimatedAmount
              winningChance
              createdAt
              updatedAt
              account {
                name
              }
              ownerEmployee {
                displayName
              }
            }
            
            historicalOpportunities: Opportunity(
              where: $historicalWhere
              orderBy: $historicalOrderBy
              limit: $historicalLimit
            ) {
              id
              estimatedAmount
              winningChance
              closeDate
              createdAt
            }
          }
        `;

        const variables = {
          activeWhere: {
            isDeleted: { _eq: false },
            closeDate: { _eq: null }
          },
          historicalWhere: {
            isDeleted: { _eq: false },
            closeDate: { _neq: null, _gte: "2024-01-01T00:00:00Z" }
          },
          activeOrderBy: [{ winningChance: 'DESC' }],
          historicalOrderBy: [{ closeDate: 'DESC' }],
          activeLimit: 100,
          historicalLimit: 50
        };

        const result = await graphqlClient.request(query, variables);
        const realDataAnalysis = generateRealDataAnalysis(result.opportunities, result.historicalOpportunities);
        setForecastData(realDataAnalysis);

      } catch (error) {
        // console.error('Error fetching forecast data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchForecastData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="opportunity-forecast-loading">
        <CardContent className="gba:p-6">
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-32 gba:bg-gray-200 gba:rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData) {
    return (
      <Card data-testid="opportunity-forecast-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-gray-500">
            Unable to load forecast data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="opportunity-forecasting-insights">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FundProjectionScreenOutlined />
            Opportunity Trends & Analysis
          </CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={forecastPeriod === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForecastPeriod('quarterly')}
              data-testid="quarterly-forecast-button"
            >
              Quarterly
            </Button>
            <Button
              variant={forecastPeriod === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForecastPeriod('monthly')}
              data-testid="monthly-forecast-button"
            >
              Monthly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pipeline Statistics Summary */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg" data-testid="total-pipeline-value">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Pipeline Value</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              €{(forecastData.pipelineStats.totalPipelineValue / 1000000).toFixed(1)}M
            </div>
          </div>

          <div className="gba:bg-green-50 gba:p-4 gba:rounded-lg" data-testid="risk-adjusted-value">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-green-600" />
              <span className="gba:text-sm gba:font-medium gba:text-green-600">Risk-Adjusted</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              €{(forecastData.pipelineStats.riskAdjustedValue / 1000000).toFixed(1)}M
            </div>
          </div>

          <div className="gba:bg-purple-50 gba:p-4 gba:rounded-lg" data-testid="total-opportunities">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                              <StarOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Total Opportunities</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {forecastData.pipelineStats.totalOpportunities}
            </div>
          </div>

          <div className="gba:bg-orange-50 gba:p-4 gba:rounded-lg" data-testid="average-win-chance">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <CalendarOutlined className="gba:text-orange-600" />
              <span className="gba:text-sm gba:font-medium gba:text-orange-600">Avg. Win Chance</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-orange-900">
              {forecastData.pipelineStats.averageWinChance}%
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="gba:h-80 gba:mb-6">
          <ResponsiveContainer width="100%" height="100%">
            {forecastPeriod === 'quarterly' ? (
              <ComposedChart data={forecastData.quarterlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name.includes('Revenue') ? `€${(value / 1000000).toFixed(1)}M` : value,
                    name === 'totalRevenue' ? 'Total Revenue' :
                    name === 'closedRevenue' ? 'Closed Revenue' :
                    name === 'totalOpportunities' ? 'Total Opportunities' :
                    name === 'closedOpportunities' ? 'Closed Opportunities' : 'Conversion Rate %'
                  ]}
                />
                <Legend />
                <Bar dataKey="totalOpportunities" fill="#E5E7EB" name="Total Opportunities" />
                <Bar dataKey="closedOpportunities" fill="#3B82F6" name="Closed Opportunities" />
                <Line 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Conversion Rate %"
                />
              </ComposedChart>
            ) : (
              <AreaChart data={forecastData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name.includes('Value') ? `€${(value / 1000000).toFixed(1)}M` : value,
                    name === 'actualCreated' ? 'Created' :
                    name === 'actualClosed' ? 'Closed' :
                    name === 'actualValue' ? 'Created Value' : 'Closed Value'
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actualValue"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Created Value"
                />
                <Area
                  type="monotone"
                  dataKey="actualClosedValue"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.5}
                  name="Closed Value"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Top Opportunities */}
        <div data-testid="top-opportunities-section">
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <RiseOutlined />
            Top Opportunities by Win Chance
          </h4>
          <div className="gba:space-y-3">
            {forecastData.topOpportunities.slice(0, 6).map((opportunity, index) => (
              <div
                key={opportunity.id}
                className="gba:p-4 gba:border gba:rounded-lg gba:bg-gray-50"
                data-testid={`top-opportunity-${index}`}
              >
                <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                  <div>
                    <div className="gba:font-medium">{opportunity.name}</div>
                    <div className="gba:text-sm gba:text-gray-600">
                      {opportunity.account && `${opportunity.account} • `}
                      {opportunity.daysInPipeline} days in pipeline
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <Badge 
                      variant="outline" 
                      className={
                        opportunity.status === 'high-confidence' ? 'gba:text-green-600 gba:border-green-300' :
                        opportunity.status === 'medium-confidence' ? 'gba:text-yellow-600 gba:border-yellow-300' :
                        'gba:text-red-600 gba:border-red-300'
                      }
                    >
                      {opportunity.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <div className="gba:text-sm gba:font-medium gba:mt-1">
                      €{opportunity.estimatedAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:text-gray-500">Win Chance:</span>
                    <Badge variant="outline" className="gba:text-blue-600 gba:border-blue-300">
                      {opportunity.currentWinChance}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};