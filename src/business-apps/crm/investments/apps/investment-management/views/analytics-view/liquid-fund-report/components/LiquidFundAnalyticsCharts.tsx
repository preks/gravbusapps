import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  BarChart,
  Bar
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react';
import { LiquidFundInvestmentSummary } from '../../shared/types';

interface LiquidFundAnalyticsChartsProps {
  chartData: any;
  rawLiquidFunds: LiquidFundInvestmentSummary[];
}

export const LiquidFundAnalyticsCharts: React.FC<LiquidFundAnalyticsChartsProps> = ({
  chartData,
  rawLiquidFunds
}) => {
  // Interest Rate vs Investment Amount Correlation
  const interestRateCorrelationData = useMemo(() => {
    return rawLiquidFunds
      .filter(fund => fund.liquidFundInvestment?.interestRate && fund.investment.totalInvestmentAmount)
      .map(fund => ({
        interestRate: fund.liquidFundInvestment!.interestRate!,
        investmentAmount: fund.investment.totalInvestmentAmount || 0,
        fundName: fund.displayName,
        fundType: fund.fundTypeName
      }));
  }, [rawLiquidFunds]);

  // Performance by Fund Type
  const performanceByTypeData = useMemo(() => {
    const typeMap = new Map();
    
    rawLiquidFunds.forEach(fund => {
      const fundType = fund.fundTypeName || 'Unknown';
      const interestRate = fund.liquidFundInvestment?.interestRate || 0;
      const investmentAmount = fund.investment.totalInvestmentAmount || 0;
      
      if (typeMap.has(fundType)) {
        const existing = typeMap.get(fundType);
        existing.totalInterestRate += interestRate;
        existing.totalInvestmentAmount += investmentAmount;
        existing.count += 1;
      } else {
        typeMap.set(fundType, {
          fundType,
          totalInterestRate: interestRate,
          totalInvestmentAmount: investmentAmount,
          count: 1
        });
      }
    });

    return Array.from(typeMap.values()).map(item => ({
      ...item,
      averageInterestRate: item.count > 0 ? item.totalInterestRate / item.count : 0,
      averageInvestmentAmount: item.count > 0 ? item.totalInvestmentAmount / item.count : 0,
      name: item.fundType.toLowerCase().replace(/\s+/g, '')
    }));
  }, [rawLiquidFunds]);


  return (
    <div className="gba:space-y-6">
      {/* Interest Rate vs Investment Amount Correlation */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle>Interest Rate vs Amount Correlation for Fixed-Term Deposits</CardTitle>
              <CardDescription>Correlation between interest rates and investment amounts for fixed-term deposits</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={{
              ratevsamount: { label: 'Rate vs Amount' }
            }}
            className="gba:h-[400px] gba:w-full"
          >
            <ScatterChart data={interestRateCorrelationData}>
              <XAxis 
                type="number"
                dataKey="interestRate"
                name="Interest Rate"
                unit="%"
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="number"
                dataKey="investmentAmount"
                name="Investment Amount"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                          Fixed-Term Deposit
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full" 
                            style={{ backgroundColor: 'var(--color-ratevsamount)' }}
                          />
                          <span className="gba:font-medium">Interest Rate:</span>
                          <span className="gba:font-semibold">{data.interestRate}%</span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full" 
                            style={{ backgroundColor: 'var(--color-ratevsamount)' }}
                          />
                          <span className="gba:font-medium">Investment Amount:</span>
                          <span className="gba:font-semibold">{formatCurrency(data.investmentAmount)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="ratevsamount"
                fill="var(--color-ratevsamount)"
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance by Fund Type */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartBarIcon} variant="secondary" size="md" decorative />
            <div>
              <CardTitle>Performance Analysis by Fund Type</CardTitle>
              <CardDescription>Average interest rates and investment amounts by fund type</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => {
              const config: Record<string, { label: string }> = {};
              config.averageinterestrate = { label: 'Average Interest Rate' };
              config.averageinvestmentamount = { label: 'Average Investment Amount' };
              return config;
            }, [])}
            className="gba:h-[400px] gba:w-full"
          >
            <BarChart data={performanceByTypeData}>
              <XAxis dataKey="fundType" />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                          {label}
                        </div>
                        {payload.map((entry, index) => {
                          let formattedValue = '';
                          let properLabel = '';
                          let dotColor = '';
                          
                          if (entry.dataKey === 'averageInterestRate') {
                            formattedValue = `${(entry.value as number).toFixed(2)}%`;
                            properLabel = 'Average Interest Rate';
                            dotColor = 'var(--color-averageinterestrate)';
                          } else if (entry.dataKey === 'averageInvestmentAmount') {
                            formattedValue = formatCurrency(entry.value as number);
                            properLabel = 'Average Investment Amount';
                            dotColor = 'var(--color-averageinvestmentamount)';
                          }
                          
                          return (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div 
                                className="gba:w-3 gba:h-3 gba:rounded-full" 
                                style={{ backgroundColor: dotColor }}
                              />
                              <span className="gba:font-medium">{properLabel}:</span>
                              <span className="gba:font-semibold">{formattedValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left"
                dataKey="averageInterestRate" 
                name="averageinterestrate"
                fill="var(--color-averageinterestrate)"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="averageInvestmentAmount" 
                name="averageinvestmentamount"
                fill="var(--color-averageinvestmentamount)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  );
};
