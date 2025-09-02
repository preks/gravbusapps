import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  HeartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

interface DealHealthData {
  healthDistribution: {
    healthy: number;
    warning: number;
    critical: number;
    excellent: number;
  };
  matrixData: {
    id: string;
    name: string;
    winningChance: number;
    estimatedAmount: number;
    daysInPipeline: number;
    healthScore: number;
    healthCategory: 'excellent' | 'healthy' | 'warning' | 'critical';
    riskFactors: string[];
    account?: string;
    owner?: string;
  }[];
}

interface DealHealthMatrixProps extends BusinessAppContextProps {
  data?: any;
}

export const DealHealthMatrix: React.FC<DealHealthMatrixProps> = ({ 
  accessToken
}) => {
  const [healthData, setHealthData] = useState<DealHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const graphqlClient = useGraphQLClient(accessToken);

  // Calculate health score based on multiple factors
  const calculateHealthScore = (opportunity: any): { score: number; riskFactors: string[] } => {
    let score = 100;
    const riskFactors: string[] = [];
    
    const currentDate = new Date();
    const createdDate = new Date(opportunity.createdAt);
    const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Factor 1: Days in pipeline (older deals are riskier)
    if (daysInPipeline > 365) {
      score -= 30;
      riskFactors.push('Very old opportunity (>1 year)');
    } else if (daysInPipeline > 180) {
      score -= 20;
      riskFactors.push('Old opportunity (>6 months)');
    } else if (daysInPipeline > 90) {
      score -= 10;
      riskFactors.push('Aging opportunity (>3 months)');
    }
    
    // Factor 2: Winning chance
    const winChance = opportunity.winningChance || 0;
    if (winChance < 30) {
      score -= 25;
      riskFactors.push('Low win probability (<30%)');
    } else if (winChance < 50) {
      score -= 15;
      riskFactors.push('Moderate win probability (30-50%)');
    } else if (winChance > 90) {
      score += 10; // Bonus for very high win chance
    }
    
    // Factor 3: Deal size vs average (smaller deals might get less attention)
    const amount = opportunity.estimatedAmount || 0;
    if (amount < 50000) {
      score -= 10;
      riskFactors.push('Small deal size (<€50k)');
    } else if (amount > 200000) {
      score += 5; // Bonus for large deals
    }
    
    // Factor 4: Missing account (indicates incomplete data)
    if (!opportunity.account) {
      score -= 15;
      riskFactors.push('No associated account');
    }
    
    // Factor 5: Missing owner
    if (!opportunity.ownerEmployee) {
      score -= 20;
      riskFactors.push('No assigned owner');
    }
    
    // Factor 6: No recent activity (if updated date is very old)
    if (opportunity.updatedAt) {
      const updatedDate = new Date(opportunity.updatedAt);
      const daysSinceUpdate = Math.floor((currentDate.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 30) {
        score -= 15;
        riskFactors.push('No recent activity (>30 days)');
      }
    } else {
      score -= 15;
      riskFactors.push('No recent activity');
    }
    
    return { score: Math.max(0, Math.min(100, score)), riskFactors };
  };

  const getHealthCategory = (score: number): 'excellent' | 'healthy' | 'warning' | 'critical' => {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'healthy';
    if (score >= 50) return 'warning';
    return 'critical';
  };

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setIsLoading(true);
        
        const query = `
          query GetDealHealthData(
            $where: OpportunityBoolExp
            $orderBy: [OpportunityOrderBy!]
            $limit: Int
          ) {
            opportunities: Opportunity(
              where: $where
              orderBy: $orderBy
              limit: $limit
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
          }
        `;

        const variables = {
          where: {
            isDeleted: { _eq: false },
            closeDate: { _eq: null }
          },
          orderBy: [{ createdAt: 'DESC' }],
          limit: 150
        };

        const result = await graphqlClient.request(query, variables);
        
        // Process health scores
        const processedOpportunities = result.opportunities.map((opp: any) => {
          const currentDate = new Date();
          const createdDate = new Date(opp.createdAt);
          const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const { score, riskFactors } = calculateHealthScore(opp);
          const healthCategory = getHealthCategory(score);
          
          return {
            id: opp.id,
            name: opp.name,
            winningChance: opp.winningChance || 0,
            estimatedAmount: opp.estimatedAmount || 0,
            daysInPipeline,
            healthScore: score,
            healthCategory,
            riskFactors,
            account: opp.account?.name,
            owner: opp.ownerEmployee?.displayName
          };
        });

        // Calculate distribution
        const distribution = processedOpportunities.reduce(
          (acc: { excellent: number; healthy: number; warning: number; critical: number }, opp: any) => {
            const category = opp.healthCategory as keyof typeof acc;
            acc[category]++;
            return acc;
          },
          { excellent: 0, healthy: 0, warning: 0, critical: 0 }
        );

        setHealthData({
          healthDistribution: distribution,
          matrixData: processedOpportunities
        });

      } catch (error) {
        // console.error('Error fetching health data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchHealthData();
    }
  }, [accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <Card data-testid="deal-health-loading">
        <CardContent className="gba:p-6">
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-32 gba:bg-gray-200 gba:rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card data-testid="deal-health-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:text-gray-500">
            Unable to load deal health data
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter data based on selected category
  const filteredData = selectedCategory === 'all' 
    ? healthData.matrixData 
    : healthData.matrixData.filter(item => item.healthCategory === selectedCategory);

  // Color mapping for health categories
  const getHealthColor = (category: string) => {
    switch (category) {
      case 'excellent': return '#10B981';
      case 'healthy': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <Card data-testid="deal-health-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <HeartOutlined />
          Deal Health Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Health Distribution Summary */}
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div 
            className="gba:bg-green-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all"
            onClick={() => setSelectedCategory(selectedCategory === 'excellent' ? 'all' : 'excellent')}
            data-testid="excellent-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <CheckCircleOutlined className="gba:text-green-600" />
              <span className="gba:text-sm gba:font-medium gba:text-green-600">Excellent</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">
              {healthData.healthDistribution.excellent}
            </div>
          </div>

          <div 
            className="gba:bg-blue-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all"
            onClick={() => setSelectedCategory(selectedCategory === 'healthy' ? 'all' : 'healthy')}
            data-testid="healthy-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <HeartOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Healthy</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">
              {healthData.healthDistribution.healthy}
            </div>
          </div>

          <div 
            className="gba:bg-yellow-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all"
            onClick={() => setSelectedCategory(selectedCategory === 'warning' ? 'all' : 'warning')}
            data-testid="warning-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <WarningOutlined className="gba:text-yellow-600" />
              <span className="gba:text-sm gba:font-medium gba:text-yellow-600">Warning</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">
              {healthData.healthDistribution.warning}
            </div>
          </div>

          <div 
            className="gba:bg-red-50 gba:p-4 gba:rounded-lg gba:cursor-pointer gba:transition-all"
            onClick={() => setSelectedCategory(selectedCategory === 'critical' ? 'all' : 'critical')}
            data-testid="critical-deals-filter"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ExclamationCircleOutlined className="gba:text-red-600" />
              <span className="gba:text-sm gba:font-medium gba:text-red-600">Critical</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-red-900">
              {healthData.healthDistribution.critical}
            </div>
          </div>
        </div>

        {/* Health Matrix Scatter Plot */}
        <div className="gba:h-80 gba:mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              data={filteredData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="winningChance" 
                name="Win Chance %" 
                unit="%" 
                domain={[0, 100]}
              />
              <YAxis 
                type="number" 
                dataKey="healthScore" 
                name="Health Score" 
                domain={[0, 100]}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
                        <p className="gba:font-medium">{data.name}</p>
                        <p className="gba:text-sm gba:text-gray-600">
                          Health Score: {data.healthScore}/100
                        </p>
                        <p className="gba:text-sm gba:text-gray-600">
                          Win Chance: {data.winningChance}%
                        </p>
                        <p className="gba:text-sm gba:text-gray-600">
                          Value: €{data.estimatedAmount.toLocaleString()}
                        </p>
                        <p className="gba:text-sm gba:text-gray-600">
                          Days in Pipeline: {data.daysInPipeline}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Deals" dataKey="estimatedAmount" fill="#8884d8">
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHealthColor(entry.healthCategory)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Critical Deals that Need Attention */}
        {(selectedCategory === 'all' || selectedCategory === 'critical') && (
          <div data-testid="critical-deals-section">
            <h4 className="gba:text-lg gba:font-semibold gba:mb-3 gba:flex gba:items-center gba:gap-2">
              <ExclamationCircleOutlined className="gba:text-red-600" />
              Critical Deals Requiring Immediate Attention
            </h4>
            <div className="gba:space-y-3">
              {healthData.matrixData
                .filter(deal => deal.healthCategory === 'critical')
                .slice(0, 5)
                .map((deal, index) => (
                  <div
                    key={deal.id}
                    className="gba:p-4 gba:border-l-4 gba:border-red-500 gba:bg-red-50 gba:rounded"
                    data-testid={`critical-deal-${index}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                      <div>
                        <div className="gba:font-medium">{deal.name}</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          {deal.account && `${deal.account} • `}
                          {deal.owner && `${deal.owner} • `}
                          {deal.daysInPipeline} days in pipeline
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <Badge variant="destructive">
                          Health Score: {deal.healthScore}/100
                        </Badge>
                        <div className="gba:text-sm gba:font-medium gba:mt-1">
                          €{deal.estimatedAmount.toLocaleString()} • {deal.winningChance}% win chance
                        </div>
                      </div>
                    </div>
                    <div className="gba:text-sm gba:text-red-700">
                      <strong>Risk Factors:</strong> {deal.riskFactors.join(', ')}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};