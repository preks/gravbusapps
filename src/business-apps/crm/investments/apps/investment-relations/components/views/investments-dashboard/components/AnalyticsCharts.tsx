import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { TrendingUp, PieChart, BarChart3, Target } from "lucide-react";

/**
 * Component displaying analytics charts and visualizations
 */
const AnalyticsCharts = () => {
  // Mock data for charts - in real implementation, this would come from props or API
  const allocationData = [
    { type: 'Real Estate', value: 45.8, color: '#10B981' },
    { type: 'Equity', value: 33.7, color: '#3B82F6' },
    { type: 'Private Equity', value: 10.0, color: '#8B5CF6' },
    { type: 'Liquid Funds', value: 10.5, color: '#F59E0B' }
  ];

  const performanceData = [
    { quarter: 'Q1 2023', value: 74.1 },
    { quarter: 'Q2 2023', value: 76.8 },
    { quarter: 'Q3 2023', value: 79.2 },
    { quarter: 'Q4 2023', value: 80.7 }
  ];

  const roiData = [
    { type: 'Equity', roi: 27.5, target: 25.0 },
    { type: 'Private Equity', roi: 22.0, target: 20.0 },
    { type: 'Real Estate', roi: 12.0, target: 10.0 },
    { type: 'Liquid Funds', roi: 5.2, target: 4.0 }
  ];

  return (
    <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
      {/* Portfolio Allocation Chart */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">Portfolio Allocation</CardTitle>
            <p className="gba:text-sm gba:text-gray-600">By investment type</p>
          </div>
          <PieChart className="gba:h-5 gba:w-5 gba:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {/* Pie Chart Visualization */}
            <div className="gba:relative gba:w-48 gba:h-48 gba:mx-auto">
              <svg viewBox="0 0 200 200" className="gba:w-full gba:h-full gba:transform gba:-rotate-90">
                {allocationData.map((item, index) => {
                  const startAngle = allocationData.slice(0, index).reduce((sum, d) => sum + (d.value / 100) * 360, 0);
                  const endAngle = startAngle + (item.value / 100) * 360;
                  const largeArcFlag = item.value > 50 ? 1 : 0;
                  
                  const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
                  const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
                  
                  return (
                    <path
                      key={item.type}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="gba:opacity-80 hover:gba:opacity-100 gba:transition-opacity"
                    />
                  );
                })}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="gba:space-y-2">
              {allocationData.map((item) => (
                <div key={item.type} className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div 
                      className="gba:w-3 gba:h-3 gba:rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="gba:text-sm gba:text-gray-700">{item.type}</span>
                  </div>
                  <span className="gba:text-sm gba:font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trend */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">Portfolio Performance</CardTitle>
            <p className="gba:text-sm gba:text-gray-600">Total invested over time (M€)</p>
          </div>
          <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="gba:h-48 gba:relative">
            <svg viewBox="0 0 400 200" className="gba:w-full gba:h-full">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="40"
                  y1={40 + i * 30}
                  x2="380"
                  y2={40 + i * 30}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
              ))}
              
              {/* Performance line */}
              <polyline
                points={performanceData.map((d, i) => `${60 + i * 100},${180 - (d.value - 70) * 4}`).join(' ')}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                className="gba:drop-shadow-sm"
              />
              
              {/* Data points */}
              {performanceData.map((d, i) => (
                <circle
                  key={i}
                  cx={60 + i * 100}
                  cy={180 - (d.value - 70) * 4}
                  r="4"
                  fill="#3B82F6"
                  className="gba:drop-shadow-sm"
                />
              ))}
              
              {/* Labels */}
              {performanceData.map((d, i) => (
                <text
                  key={i}
                  x={60 + i * 100}
                  y="195"
                  textAnchor="middle"
                  className="gba:text-xs gba:fill-gray-600"
                >
                  {d.quarter}
                </text>
              ))}
            </svg>
          </div>
          <div className="gba:mt-4 gba:text-center">
            <span className="gba:text-2xl gba:font-bold gba:text-green-600">+8.9%</span>
            <span className="gba:text-sm gba:text-gray-600 gba:ml-2">YoY Growth</span>
          </div>
        </CardContent>
      </Card>

      {/* ROI Performance vs Targets */}
      <Card className="gba:lg:col-span-2">
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">ROI Performance vs Targets</CardTitle>
            <p className="gba:text-sm gba:text-gray-600">Actual vs target expected ROI by investment type</p>
          </div>
          <Target className="gba:h-5 gba:w-5 gba:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-6">
            {roiData.map((item) => (
              <div key={item.type} className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">{item.type}</span>
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <span className="gba:text-sm gba:text-gray-600">Target: {item.target}%</span>
                    <span className="gba:text-sm gba:font-semibold gba:text-green-600">Actual: {item.roi}%</span>
                  </div>
                </div>
                <div className="gba:relative gba:h-3 gba:bg-gray-200 gba:rounded-full gba:overflow-hidden">
                  {/* Target line */}
                  <div 
                    className="gba:absolute gba:top-0 gba:h-full gba:w-0.5 gba:bg-gray-500 gba:z-10"
                    style={{ left: `${(item.target / 30) * 100}%` }}
                  />
                  {/* Actual progress */}
                  <div 
                    className="gba:h-full gba:bg-green-500 gba:rounded-full gba:transition-all gba:duration-500"
                    style={{ width: `${Math.min((item.roi / 30) * 100, 100)}%` }}
                  />
                </div>
                <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;