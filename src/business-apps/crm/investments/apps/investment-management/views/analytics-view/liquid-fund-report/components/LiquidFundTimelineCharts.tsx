import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  ComposedChart,
  Area
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react';
import { LiquidFundInvestmentSummary } from '../../shared/types';
import dayjs from 'dayjs';

interface LiquidFundTimelineChartsProps {
  chartData: any;
  rawLiquidFunds: LiquidFundInvestmentSummary[];
}

export const LiquidFundTimelineCharts: React.FC<LiquidFundTimelineChartsProps> = ({
  chartData,
  rawLiquidFunds
}) => {
  // Get available currencies
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(rawLiquidFunds.map(fund => fund.currencyCode || 'EUR'))];
    return currencies.filter(currency => currency).sort();
  }, [rawLiquidFunds]);

  // Currency filters
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');
  const [valueCurrencyFilter, setValueCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');

  // Investment Performance Timeline (matching Overview pattern)
  const investmentPerformanceData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(fund => 
      fund.currencyCode === performanceCurrencyFilter && fund.investment.acquisitionDate
    );
    
    return filteredFunds
      .sort((a, b) => dayjs(a.investment.acquisitionDate).unix() - dayjs(b.investment.acquisitionDate).unix())
      .reduce((acc, fund) => {
        const date = dayjs(fund.investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find((item: any) => item.month === date);
        const totalInvestmentAmount = fund.investment.totalInvestmentAmount || 0;
        const marketValue = fund.investment.investmentMarketValue || 0;
        
        if (existing) {
          existing.investmentCount += 1;
          existing.totalInvestmentAmount += totalInvestmentAmount;
          existing.totalMarketValue += marketValue;
        } else {
          acc.push({
            month: date,
            investmentCount: 1,
            totalInvestmentAmount: totalInvestmentAmount,
            totalMarketValue: marketValue
          });
        }
        return acc;
      }, [] as any[])
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((item: any, index: number, array: any[]) => {
        let cumulativeCount = 0;
        let cumulativeTotalInvested = 0;
        for (let i = 0; i <= index; i++) {
          cumulativeCount += array[i].investmentCount;
          cumulativeTotalInvested += array[i].totalInvestmentAmount;
        }
        return {
          ...item,
          cumulativeInvestments: cumulativeCount,
          cumulativeTotalInvested: cumulativeTotalInvested
        };
      });
  }, [rawLiquidFunds, performanceCurrencyFilter]);

  // Value Trends Over Time (matching Overview pattern)
  const valueTrendsData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(fund => 
      fund.currencyCode === valueCurrencyFilter && fund.investment.acquisitionDate
    );
    
    const dataMap = new Map();
    
    filteredFunds.forEach(fund => {
      const date = dayjs(fund.investment.acquisitionDate).format('YYYY-MM');
      const totalInvestmentAmount = fund.investment.totalInvestmentAmount || 0;
      const marketValue = fund.investment.investmentMarketValue || 0;
      
      if (dataMap.has(date)) {
        const existing = dataMap.get(date);
        existing.totalInvestmentAmount += totalInvestmentAmount;
        existing.totalMarketValue += marketValue;
      } else {
        dataMap.set(date, {
          date,
          totalInvestmentAmount: totalInvestmentAmount,
          totalMarketValue: marketValue
        });
      }
    });
    
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rawLiquidFunds, valueCurrencyFilter]);

  return (
    <div className="gba:space-y-6">
      {/* Investment Performance Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Investment Performance Timeline ({performanceCurrencyFilter})</CardTitle>
                <CardDescription>Investment count, total invested amount, and cumulative investments over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Select value={performanceCurrencyFilter} onValueChange={setPerformanceCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => {
              const config = {
                investmentcount: { label: "New Investments" },
                totalinvestmentamount: { label: "Total Invested Amount" },
                cumulativeinvestments: { label: "Cumulative Investments" }
              };
              return config;
            }, [])} 
            className="gba:h-[350px] gba:w-full"
          >
            <ComposedChart
              data={investmentPerformanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => {
                  if (name === 'Total Invested Amount') {
                    return [formatCurrency(value as number, performanceCurrencyFilter), name];
                  }
                  return [value, name];
                }} />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left"
                dataKey="investmentCount" 
                name="investmentcount"
                fill="var(--color-investmentcount)"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="totalInvestmentAmount" 
                name="totalinvestmentamount"
                stroke="var(--color-totalinvestmentamount)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="cumulativeInvestments" 
                name="cumulativeinvestments"
                stroke="var(--color-cumulativeinvestments)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Investment Value Trends Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Investment Value Trends Over Time ({valueCurrencyFilter})</CardTitle>
                <CardDescription>Comparison of total invested amount vs. market value over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Select value={valueCurrencyFilter} onValueChange={setValueCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => {
              const config = {
                totalinvestmentamount: { label: "Total Invested Amount" },
                totalmarketvalue: { label: "Total Market Value" }
              };
              return config;
            }, [])} 
            className="gba:h-[350px] gba:w-full"
          >
            <ComposedChart
              data={valueTrendsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => dayjs(value).format('MMM YY')}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, valueCurrencyFilter)}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value, name) => [
                    formatCurrency(value as number, valueCurrencyFilter), 
                    name
                  ]} 
                  labelFormatter={(label) => dayjs(label).format('MMMM YYYY')}
                />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line 
                type="monotone" 
                dataKey="totalInvestmentAmount" 
                name="totalinvestmentamount"
                stroke="var(--color-totalinvestmentamount)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalMarketValue" 
                name="totalmarketvalue"
                stroke="var(--color-totalmarketvalue)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};