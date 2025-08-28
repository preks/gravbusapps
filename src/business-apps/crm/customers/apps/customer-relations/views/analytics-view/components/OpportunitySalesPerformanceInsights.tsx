import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrophyOutlined,
  StarOutlined
} from '@ant-design/icons';

interface SalesPerformanceData {
  topPerformers: {
    ownerId: string;
    ownerName: string;
    totalOpportunities: number;
    totalValue: number;
    avgWinRate: number;
    avgDealSize: number;
    pipelineVelocity: number; // days to close
    performanceScore: number;
  }[];
  performanceMetrics: {
    metric: string;
    currentPeriod: number;
    trend: 'up' | 'down' | 'stable';
    target?: number;
  }[];
  dealSizeDistribution: {
    range: string;
    count: number;
    value: number;
    percentage: number;
  }[];
  winRateBySize: {
    sizeCategory: string;
    winRate: number;
    opportunityCount: number;
    avgDaysToClose: number;
  }[];
  monthlyPerformance: {
    month: string;
    dealsWon: number;
    totalValue: number;
    avgWinRate: number;
    activeReps: number;
  }[];
}

interface OpportunitySalesPerformanceInsightsProps extends BusinessAppContextProps {
  data?: any;
}

export const OpportunitySalesPerformanceInsights: React.FC<OpportunitySalesPerformanceInsightsProps> = ({ 
  accessToken
}) => {
  const [performanceData, setPerformanceData] = useState<SalesPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'individual' | 'trends'>('overview');
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true);
        
        const query = `
          query GetSalesPerformanceData(
            $allOppsWhere: OpportunityBoolExp
            $recentOppsWhere: OpportunityBoolExp
            $allOppsOrderBy: [OpportunityOrderBy!]
            $recentOppsOrderBy: [OpportunityOrderBy!]
            $allOppsLimit: Int
          ) {
            opportunities: Opportunity(
              where: $allOppsWhere
              orderBy: $allOppsOrderBy
              limit: $allOppsLimit
            ) {
              id
              name
              estimatedAmount
              winningChance
              createdAt
              updatedAt
              closeDate
              ownerEmployee {
                id
                displayName
                firstName
                lastName
              }
            }
            
            recentOpportunities: Opportunity(
              where: $recentOppsWhere
              orderBy: $recentOppsOrderBy
            ) {
              id
              estimatedAmount
              winningChance
              createdAt
              closeDate
              ownerEmployee {
                id
                displayName
              }
            }
          }
        `;

        const variables = {
          allOppsWhere: {
            isDeleted: { _eq: false }
          },
          recentOppsWhere: {
            isDeleted: { _eq: false },
            createdAt: { _gte: "2024-06-01T00:00:00Z" }
          },
          allOppsOrderBy: [{ createdAt: 'DESC' }],
          recentOppsOrderBy: [{ createdAt: 'DESC' }],
          allOppsLimit: 500
        };

        const result = await graphqlClient.request(query, variables);
        
        // Process sales performance data
        const ownerPerformance = new Map<string, any>();
        
        result.opportunities.forEach((opp: any) => {
          const ownerId = opp.ownerEmployee?.id;
          const ownerName = opp.ownerEmployee?.displayName || 'Unassigned';
          
          if (!ownerId) return;
          
          if (!ownerPerformance.has(ownerId)) {
            ownerPerformance.set(ownerId, {
              ownerId,
              ownerName,
              opportunities: [],
              totalValue: 0,
              wonDeals: 0,
              totalDaysToClose: 0,
              closedDeals: 0
            });
          }
          
          const owner = ownerPerformance.get(ownerId);
          owner.opportunities.push(opp);
          owner.totalValue += opp.estimatedAmount || 0;
          
          if (opp.closeDate) {
            owner.closedDeals++;
            if (opp.winningChance && opp.winningChance >= 80) {
              owner.wonDeals++;
            }
            
            const createdDate = new Date(opp.createdAt);
            const closedDate = new Date(opp.closeDate);
            const daysToClose = Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            owner.totalDaysToClose += daysToClose;
          }
        });

        // Calculate performance metrics for each owner
        const topPerformers = Array.from(ownerPerformance.values())
          .filter(owner => owner.opportunities.length >= 3) // Minimum 3 opportunities
          .map(owner => {
            const avgWinRate = owner.opportunities.reduce((sum: number, opp: any) => 
              sum + (opp.winningChance || 0), 0) / owner.opportunities.length;
            const avgDealSize = owner.totalValue / owner.opportunities.length;
            const pipelineVelocity = owner.closedDeals > 0 ? owner.totalDaysToClose / owner.closedDeals : 0;
            
            // Calculate performance score (weighted formula)
            const performanceScore = Math.round(
              (avgWinRate * 0.3) + 
              (Math.min(100, avgDealSize / 1500) * 0.25) + 
              (Math.max(0, 100 - (pipelineVelocity / 3)) * 0.2) + 
              (Math.min(100, owner.opportunities.length * 10) * 0.25)
            );
            
            return {
              ownerId: owner.ownerId,
              ownerName: owner.ownerName,
              totalOpportunities: owner.opportunities.length,
              totalValue: owner.totalValue,
              avgWinRate: Math.round(avgWinRate),
              avgDealSize: Math.round(avgDealSize),
              pipelineVelocity: Math.round(pipelineVelocity),
              performanceScore: Math.min(100, performanceScore)
            };
          })
          .sort((a, b) => b.performanceScore - a.performanceScore)
          .slice(0, 10);

        // Calculate deal size distribution
        const sizeRanges = [
          { min: 0, max: 50000, label: "€0-50k" },
          { min: 50000, max: 100000, label: "€50k-100k" },
          { min: 100000, max: 250000, label: "€100k-250k" },
          { min: 250000, max: 500000, label: "€250k-500k" },
          { min: 500000, max: Infinity, label: "€500k+" }
        ];

        const dealSizeDistribution = sizeRanges.map(range => {
          const opportunities = result.opportunities.filter((opp: any) => {
            const amount = opp.estimatedAmount || 0;
            return amount >= range.min && amount < range.max;
          });
          
          const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
          
          return {
            range: range.label,
            count: opportunities.length,
            value: totalValue,
            percentage: Math.round((opportunities.length / result.opportunities.length) * 100)
          };
        });

        // Calculate win rate by deal size
        const winRateBySize = sizeRanges.map(range => {
          const opportunities = result.opportunities.filter((opp: any) => {
            const amount = opp.estimatedAmount || 0;
            return amount >= range.min && amount < range.max;
          });
          
          const avgWinRate = opportunities.length > 0 
            ? opportunities.reduce((sum: number, opp: any) => sum + (opp.winningChance || 0), 0) / opportunities.length
            : 0;
          
          const closedOpps = opportunities.filter((opp: any) => opp.closeDate);
          const avgDaysToClose = closedOpps.length > 0 
            ? closedOpps.reduce((sum: number, opp: any) => {
                const days = Math.floor((new Date(opp.closeDate).getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                return sum + days;
              }, 0) / closedOpps.length
            : 0;
          
          return {
            sizeCategory: range.label,
            winRate: Math.round(avgWinRate),
            opportunityCount: opportunities.length,
            avgDaysToClose: Math.round(avgDaysToClose)
          };
        });

        // Generate monthly performance trends
        const monthlyPerformance = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthOpportunities = result.recentOpportunities.filter((opp: any) => {
            const oppDate = new Date(opp.createdAt);
            return oppDate >= monthStart && oppDate <= monthEnd;
          });
          
          const wonDeals = monthOpportunities.filter((opp: any) => 
            opp.closeDate && opp.winningChance >= 80
          ).length;
          
          const totalValue = monthOpportunities
            .filter((opp: any) => opp.closeDate && opp.winningChance >= 80)
            .reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0);
          
          const avgWinRate = monthOpportunities.length > 0 
            ? monthOpportunities.reduce((sum: number, opp: any) => sum + (opp.winningChance || 0), 0) / monthOpportunities.length
            : 0;
          
          const activeReps = new Set(monthOpportunities.map((opp: any) => opp.ownerEmployee?.id).filter(Boolean)).size;
          
          monthlyPerformance.push({
            month: monthKey,
            dealsWon: wonDeals,
            totalValue,
            avgWinRate: Math.round(avgWinRate),
            activeReps
          });
        }

        // Performance metrics comparison
        const performanceMetrics = [
          {
            metric: 'Average Deal Size',
            currentPeriod: Math.round(result.opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0) / result.opportunities.length),
            trend: 'up' as const,
            target: 125000
          },
          {
            metric: 'Win Rate',
            currentPeriod: Math.round(result.opportunities.reduce((sum: number, opp: any) => sum + (opp.winningChance || 0), 0) / result.opportunities.length),
            trend: 'up' as const,
            target: 75
          },
          {
            metric: 'Sales Velocity',
            currentPeriod: result.opportunities.length > 0 ? Math.round(
              result.opportunities.reduce((sum: number, opp: any) => {
                const daysInPipeline = Math.floor((new Date().getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                return sum + daysInPipeline;
              }, 0) / result.opportunities.length
            ) : 0,
            trend: 'up' as const, // Lower is better for velocity
            target: 40
          },
          {
            metric: 'Pipeline Value',
            currentPeriod: Math.round(result.opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0) / 1000000),
            trend: 'up' as const,
            target: 50
          }
        ];

        setPerformanceData({
          topPerformers,
          performanceMetrics,
          dealSizeDistribution,
          winRateBySize,
          monthlyPerformance
        });

      } catch (error) {
        // console.error('Error fetching performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchPerformanceData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="sales-performance-loading">
        <CardContent className="gba:p-6">
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-32 gba:bg-gray-200 gba:rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card data-testid="sales-performance-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-gray-500">
            Unable to load sales performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Card data-testid="opportunity-sales-performance-insights">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrophyOutlined />
            Sales Performance Analytics
          </CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('overview')}
              data-testid="overview-mode-button"
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('individual')}
              data-testid="individual-mode-button"
            >
              Individual
            </Button>
            <Button
              variant={viewMode === 'trends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('trends')}
              data-testid="trends-mode-button"
            >
              Trends
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Performance Metrics Overview */}
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          {performanceData.performanceMetrics.map((metric, index) => (
            <div 
              key={metric.metric}
              className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-blue-100 gba:p-4 gba:rounded-lg"
              data-testid={`performance-metric-${index}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <span className="gba:text-sm gba:font-medium gba:text-blue-600">{metric.metric}</span>
                <div className={`gba:text-sm ${metric.trend === 'up' ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
                  {metric.trend === 'up' ? '↗️' : '↘️'}
                </div>
              </div>
              <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
                {metric.metric.includes('Value') || metric.metric.includes('Size') 
                  ? `${metric.metric.includes('Pipeline') ? '€' : '€'}${metric.currentPeriod.toLocaleString()}${metric.metric.includes('Pipeline') ? 'M' : ''}`
                  : metric.metric.includes('Rate') 
                  ? `${metric.currentPeriod}%`
                  : `${metric.currentPeriod} days`
                }
              </div>
              {metric.target && (
                <div className="gba:text-xs gba:text-gray-600 gba:mt-1">
                  Target: {metric.metric.includes('Value') || metric.metric.includes('Size') 
                    ? `€${metric.target.toLocaleString()}`
                    : metric.metric.includes('Rate') 
                    ? `${metric.target}%`
                    : `${metric.target} days`
                  }
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Content Based on View Mode */}
        {viewMode === 'overview' && (
          <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
            {/* Deal Size Distribution */}
            <div className="gba:h-80">
              <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Deal Size Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData.dealSizeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ range, percentage }) => `${range}: ${percentage}%`}
                  >
                    {performanceData.dealSizeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} deals (€${props.payload.value.toLocaleString()})`,
                      props.payload.range
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Win Rate by Deal Size */}
            <div className="gba:h-80">
              <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Win Rate by Deal Size</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.winRateBySize}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sizeCategory" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'winRate' ? `${value}%` : 
                      name === 'avgDaysToClose' ? `${value} days` : value,
                      name === 'winRate' ? 'Win Rate' :
                      name === 'avgDaysToClose' ? 'Avg Days to Close' : 'Opportunities'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="winRate" fill="#3B82F6" name="Win Rate %" />
                  <Bar dataKey="avgDaysToClose" fill="#10B981" name="Avg Days to Close" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'individual' && (
          <div data-testid="top-performers-section">
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
              <StarOutlined />
              Top Sales Performers
            </h4>
            <div className="gba:space-y-4">
              {performanceData.topPerformers.slice(0, 8).map((performer, index) => (
                <div
                  key={performer.ownerId}
                  className="gba:p-4 gba:border gba:rounded-lg gba:bg-gradient-to-r gba:from-gray-50 gba:to-blue-50"
                  data-testid={`top-performer-${index}`}
                >
                  <div className="gba:flex gba:justify-between gba:items-start gba:mb-3">
                    <div>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Badge variant="outline" className="gba:text-blue-600 gba:border-blue-300">
                          #{index + 1}
                        </Badge>
                        <span className="gba:font-semibold">{performer.ownerName}</span>
                      </div>
                      <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                        {performer.totalOpportunities} opportunities • €{performer.totalValue.toLocaleString()} pipeline
                      </div>
                    </div>
                    <div className="gba:text-right">
                      <Badge 
                        variant="outline" 
                        className={
                          performer.performanceScore >= 80 ? 'gba:text-green-600 gba:border-green-300' :
                          performer.performanceScore >= 60 ? 'gba:text-yellow-600 gba:border-yellow-300' :
                          'gba:text-red-600 gba:border-red-300'
                        }
                      >
                        Score: {performer.performanceScore}/100
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-sm">
                    <div className="gba:text-center">
                      <div className="gba:font-medium gba:text-blue-600">{performer.avgWinRate}%</div>
                      <div className="gba:text-gray-500">Win Rate</div>
                    </div>
                    <div className="gba:text-center">
                      <div className="gba:font-medium gba:text-green-600">€{performer.avgDealSize.toLocaleString()}</div>
                      <div className="gba:text-gray-500">Avg Deal Size</div>
                    </div>
                    <div className="gba:text-center">
                      <div className="gba:font-medium gba:text-purple-600">{performer.pipelineVelocity} days</div>
                      <div className="gba:text-gray-500">Avg Velocity</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="gba:h-80">
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Monthly Performance Trends</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData.monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'totalValue' ? `€${(value / 1000000).toFixed(1)}M` :
                    name === 'avgWinRate' ? `${value}%` : value,
                    name === 'dealsWon' ? 'Deals Won' :
                    name === 'totalValue' ? 'Total Value' :
                    name === 'avgWinRate' ? 'Avg Win Rate' : 'Active Reps'
                  ]}
                />
                <Legend />
                <Bar dataKey="dealsWon" fill="#3B82F6" name="Deals Won" />
                <Bar dataKey="activeReps" fill="#10B981" name="Active Reps" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};