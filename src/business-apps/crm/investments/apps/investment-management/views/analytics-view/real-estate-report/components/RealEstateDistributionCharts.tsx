import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system';
import { 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartPieSliceIcon, CurrencyCircleDollarIcon, HouseIcon } from '@phosphor-icons/react';

interface RealEstateDistributionChartsProps {
  chartData: {
    typeData: any[];
    statusData: any[];
    currencyData: any[];
  };
  rawInvestments: any[]; // Raw investment data for filtering
}

export const RealEstateDistributionCharts: React.FC<RealEstateDistributionChartsProps> = ({ 
  chartData,
  rawInvestments 
}) => {
  const {
    typeData,
    statusData
  } = chartData;

  // Get available currencies from the data
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(rawInvestments.map(inv => inv.currencyCode || 'EUR'))];
    return currencies.sort();
  }, [rawInvestments]);

  const [typeCurrencyFilter, setTypeCurrencyFilter] = useState<string>('EUR');
  const [statusCurrencyFilter, setStatusCurrencyFilter] = useState<string>('EUR');

  // Update currency filters when currencies become available
  useEffect(() => {
    if (availableCurrencies.length > 0) {
      const defaultCurrency = availableCurrencies[0];
      setTypeCurrencyFilter(defaultCurrency);
      setStatusCurrencyFilter(defaultCurrency);
    }
  }, [availableCurrencies]);

  // Filter data based on selected currency for Type Total Amount chart
  const filteredTypeData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === typeCurrencyFilter)
      .reduce((acc, investment) => {
        const type = investment.investment?.investmentType?.value || 'Unknown Type';
        const existing = acc.find((item: any) => item.type === type);
        const totalAmount = investment.investment?.totalInvestmentAmount || 0;
        if (existing) {
          existing.count += 1;
          existing.totalAmount += totalAmount;
        } else {
          acc.push({ type, count: 1, totalAmount });
        }
        return acc;
      }, [] as any[]);
  }, [rawInvestments, typeCurrencyFilter]);

  // Filter data based on selected currency for Status Total Amount chart
  const filteredStatusData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === statusCurrencyFilter)
      .reduce((acc, investment) => {
        const status = investment.investment?.investmentStatus?.value || 'Unknown Status';
        const existing = acc.find((item: any) => item.status === status);
        const totalAmount = investment.investment?.totalInvestmentAmount || 0;
        if (existing) {
          existing.count += 1;
          existing.totalAmount += totalAmount;
        } else {
          acc.push({ status, count: 1, totalAmount });
        }
        return acc;
      }, [] as any[]);
  }, [rawInvestments, statusCurrencyFilter]);

  return (
    <div className="gba:space-y-6">
      {/* Type Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Count</CardTitle>
                  <CardDescription>Number of properties per type</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div> {/* Placeholder to match filter area */}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                typeData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [typeData])} 
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={typeData.map((item: any) => {
                    const key = item.type.toLowerCase().replace(/\s+/g, '');
                    return {
                      ...item, 
                      name: item.type,
                      fill: `var(--color-${key})`
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {typeData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const typeKey = data.payload.type.toLowerCase().replace(/\s+/g, '');
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div 
                              className="gba:w-3 gba:h-3 gba:rounded-full" 
                              style={{ backgroundColor: `var(--color-${typeKey})` }}
                            />
                            <span className="gba:font-medium">{data.payload.type}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {data.value} properties
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>
                    Type Distribution by Total Amount ({typeCurrencyFilter})
                  </CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <Select value={typeCurrencyFilter} onValueChange={setTypeCurrencyFilter}>
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
                const config: Record<string, { label: string }> = {};
                filteredTypeData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [filteredTypeData])} 
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredTypeData.map((item: any) => {
                    const key = item.type.toLowerCase().replace(/\s+/g, '');
                    return {
                      ...item, 
                      name: item.type,
                      fill: `var(--color-${key})`
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="totalAmount"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {filteredTypeData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const typeKey = data.payload.type.toLowerCase().replace(/\s+/g, '');
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div 
                              className="gba:w-3 gba:h-3 gba:rounded-full" 
                              style={{ backgroundColor: `var(--color-${typeKey})` }}
                            />
                            <span className="gba:font-medium">{data.payload.name}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {formatCurrency(data.value as number, typeCurrencyFilter)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={HouseIcon} variant="success" size="md" decorative />
                <div>
                  <CardTitle>Status Distribution by Count</CardTitle>
                  <CardDescription>Number of properties per status</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div> {/* Placeholder to match filter area */}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                statusData.forEach((item: any) => {
                  const key = item.status.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.status };
                });
                return config;
              }, [statusData])} 
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={statusData.map((item: any) => {
                    const key = item.status.toLowerCase().replace(/\s+/g, '');
                    return {
                      ...item, 
                      name: item.status,
                      fill: `var(--color-${key})`
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry: any, index: number) => {
                    const key = entry.status.toLowerCase().replace(/\s+/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="success" size="md" decorative />
                <div>
                  <CardTitle>
                    Status Distribution by Total Amount ({statusCurrencyFilter})
                  </CardTitle>
                  <CardDescription>Total invested amount per status</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <Select value={statusCurrencyFilter} onValueChange={setStatusCurrencyFilter}>
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
                const config: Record<string, { label: string }> = {};
                filteredStatusData.forEach((item: any) => {
                  const key = item.status.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.status };
                });
                return config;
              }, [filteredStatusData])} 
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredStatusData.map((item: any) => {
                    const key = item.status.toLowerCase().replace(/\s+/g, '');
                    return {
                      ...item, 
                      name: item.status,
                      fill: `var(--color-${key})`
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="totalAmount"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {filteredStatusData.map((entry: any, index: number) => {
                    const key = entry.status.toLowerCase().replace(/\s+/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const statusKey = data.payload.status.toLowerCase().replace(/\s+/g, '');
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div 
                              className="gba:w-3 gba:h-3 gba:rounded-full" 
                              style={{ backgroundColor: `var(--color-${statusKey})` }}
                            />
                            <span className="gba:font-medium">{data.payload.name}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {formatCurrency(data.value as number, statusCurrencyFilter)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};