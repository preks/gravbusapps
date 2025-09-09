import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system';
import { 
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react';
import dayjs from 'dayjs';

interface PortfolioTimelineChartsProps {
  rawInvestments: any[]; // Raw investment data for filtering
}

export const PortfolioTimelineCharts: React.FC<PortfolioTimelineChartsProps> = ({
  rawInvestments
}) => {
  // Get available currencies from the data
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(rawInvestments.map(inv => inv.currencyCode || 'EUR'))];
    return currencies.sort();
  }, [rawInvestments]);

  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useState<string>(() => availableCurrencies[0] || 'EUR');
  const [valueCurrencyFilter, setValueCurrencyFilter] = useState<string>(() => availableCurrencies[0] || 'EUR');

  // Filter and regenerate performance timeline data
  const filteredPerformanceData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => (inv.currencyCode || 'EUR') === performanceCurrencyFilter);
    
    return filteredInvestments
      .filter(investment => investment.acquisitionDate)
      .sort((a, b) => dayjs(a.acquisitionDate).unix() - dayjs(b.acquisitionDate).unix())
      .reduce((acc, investment) => {
        const date = dayjs(investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find((item: any) => item.month === date);
        const totalInvestmentAmount = investment.totalInvestmentAmount || 0;
        const marketValue = investment.marketValue || investment.bookValue || 0;
        
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
  }, [rawInvestments, performanceCurrencyFilter]);

  // Filter and regenerate value over time data with both invested amount and market value
  const filteredValueData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => (inv.currencyCode || 'EUR') === valueCurrencyFilter);
    
    const dataMap = new Map();
    
    filteredInvestments
      .filter(investment => investment.acquisitionDate)
      .forEach(investment => {
        const date = dayjs(investment.acquisitionDate).format('YYYY-MM');
        const totalInvestmentAmount = investment.totalInvestmentAmount || 0;
        const marketValue = investment.marketValue || 0;
        
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
  }, [rawInvestments, valueCurrencyFilter]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>
                  Investment Performance Timeline ({performanceCurrencyFilter})
                </CardTitle>
                <CardDescription>Investment count and cumulative amounts over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <Select value={performanceCurrencyFilter} onValueChange={setPerformanceCurrencyFilter}>
                <SelectTrigger className="gba:w-20 gba:h-8 gba:text-xs">
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
                totalinvestedamount: { label: "Total Invested Amount" },
                cumulativeinvestments: { label: "Cumulative Investments" }
              };
              return config;
            }, [])} 
            className="gba:h-[350px] gba:w-full"
          >
            <ComposedChart
              data={filteredPerformanceData}
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

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>
                  Investment Value Trends Over Time ({valueCurrencyFilter})
                </CardTitle>
                <CardDescription>Comparison of invested amount vs market value over time</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <Select value={valueCurrencyFilter} onValueChange={setValueCurrencyFilter}>
                <SelectTrigger className="gba:w-20 gba:h-8 gba:text-xs">
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
                totalinvestedamount: { label: "Total Invested Amount" },
                totalmarketvalue: { label: "Total Market Value" }
              };
              return config;
            }, [])} 
            className="gba:h-[300px] gba:w-full"
          >
            <AreaChart
              data={filteredValueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => formatCurrency(value, valueCurrencyFilter).replace(/[€$£¥]/g, '')} 
              />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => [
                  formatCurrency(value as number, valueCurrencyFilter), 
                  name
                ]} />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area 
                type="monotone" 
                dataKey="totalInvestmentAmount" 
                name="totalinvestmentamount"
                stackId="1"
                stroke="var(--color-totalinvestmentamount)"
                fill="var(--color-totalinvestmentamount)"
                fillOpacity={0.8}
              />
              <Area 
                type="monotone" 
                dataKey="totalMarketValue" 
                name="totalmarketvalue"
                stackId="2"
                stroke="var(--color-totalmarketvalue)"
                fill="var(--color-totalmarketvalue)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};


