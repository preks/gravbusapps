import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HeartOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export interface DealHealthItem {
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
}

export interface DealHealthData {
  healthDistribution: { excellent: number; healthy: number; warning: number; critical: number };
  matrixData: DealHealthItem[];
}

interface DealHealthMatrixProps {
  data: DealHealthData;
}

export const DealHealthMatrix: React.FC<DealHealthMatrixProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | DealHealthItem['healthCategory']>('all');

  const filteredData = useMemo(() => (selectedCategory === 'all' ? data.matrixData : data.matrixData.filter((d) => d.healthCategory === selectedCategory)), [selectedCategory, data]);

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
        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:bg-green-50 gba:p-4 gba:rounded-lg gba:cursor-pointer" onClick={() => setSelectedCategory(selectedCategory === 'excellent' ? 'all' : 'excellent')} data-testid="excellent-deals-filter">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><CheckCircleOutlined className="gba:text-green-600" /><span className="gba:text-sm gba:font-medium gba:text-green-600">Excellent</span></div>
            <div className="gba:text-2xl gba:font-bold gba:text-green-900">{data.healthDistribution.excellent}</div>
          </div>
          <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg gba:cursor-pointer" onClick={() => setSelectedCategory(selectedCategory === 'healthy' ? 'all' : 'healthy')} data-testid="healthy-deals-filter">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><HeartOutlined className="gba:text-blue-600" /><span className="gba:text-sm gba:font-medium gba:text-blue-600">Healthy</span></div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.healthDistribution.healthy}</div>
          </div>
          <div className="gba:bg-yellow-50 gba:p-4 gba:rounded-lg gba:cursor-pointer" onClick={() => setSelectedCategory(selectedCategory === 'warning' ? 'all' : 'warning')} data-testid="warning-deals-filter">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><WarningOutlined className="gba:text-yellow-600" /><span className="gba:text-sm gba:font-medium gba:text-yellow-600">Warning</span></div>
            <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">{data.healthDistribution.warning}</div>
          </div>
          <div className="gba:bg-red-50 gba:p-4 gba:rounded-lg gba:cursor-pointer" onClick={() => setSelectedCategory(selectedCategory === 'critical' ? 'all' : 'critical')} data-testid="critical-deals-filter">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><ExclamationCircleOutlined className="gba:text-red-600" /><span className="gba:text-sm gba:font-medium gba:text-red-600">Critical</span></div>
            <div className="gba:text-2xl gba:font-bold gba:text-red-900">{data.healthDistribution.critical}</div>
          </div>
        </div>

        <div className="gba:h-80 gba:mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={filteredData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="winningChance" name="Win Chance %" unit="%" domain={[0, 100]} />
              <YAxis type="number" dataKey="healthScore" name="Health Score" domain={[0, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload as DealHealthItem;
                  return (
                    <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
                      <p className="gba:font-medium">{d.name}</p>
                      <p className="gba:text-sm gba:text-gray-600">Health Score: {d.healthScore}/100</p>
                      <p className="gba:text-sm gba:text-gray-600">Win Chance: {d.winningChance}%</p>
                      <p className="gba:text-sm gba:text-gray-600">Value: €{d.estimatedAmount.toLocaleString()}</p>
                      <p className="gba:text-sm gba:text-gray-600">Days in Pipeline: {d.daysInPipeline}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Scatter name="Deals" dataKey="estimatedAmount" fill="#8884d8">
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHealthColor(entry.healthCategory)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {(selectedCategory === 'all' || selectedCategory === 'critical') && (
          <div data-testid="critical-deals-section">
            <h4 className="gba:text-lg gba:font-semibold gba:mb-3 gba:flex gba:items-center gba:gap-2">
              <ExclamationCircleOutlined className="gba:text-red-600" />
              Critical Deals Requiring Immediate Attention
            </h4>
            <div className="gba:space-y-3">
              {data.matrixData
                .filter((deal) => deal.healthCategory === 'critical')
                .sort((a, b) => b.estimatedAmount - a.estimatedAmount)
                .slice(0, 5)
                .map((deal, index) => (
                  <div key={deal.id} className="gba:p-4 gba:border-l-4 gba:border-red-500 gba:bg-red-50 gba:rounded" data-testid={`critical-deal-${index}`}>
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
                        <Badge variant="destructive">Health Score: {deal.healthScore}/100</Badge>
                        <div className="gba:text-sm gba:font-medium gba:mt-1">€{deal.estimatedAmount.toLocaleString()} • {deal.winningChance}% win chance</div>
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

export default DealHealthMatrix;


