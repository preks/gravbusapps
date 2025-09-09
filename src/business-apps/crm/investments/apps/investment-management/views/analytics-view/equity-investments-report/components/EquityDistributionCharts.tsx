import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import {
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { 
  ChartPieSliceIcon, 
  ChartDonutIcon, 
  PercentIcon, 
  CurrencyCircleDollarIcon 
} from '@phosphor-icons/react';
import { EquityInvestmentSummary } from '../../shared/types';

// Design system chart colors using CSS variables
const CHART_COLORS = [
  'var(--nw-color-primary-500)',      // Blue
  'var(--nw-color-success-500)',      // Green  
  'var(--nw-color-warning-500)',      // Yellow/Orange
  'var(--nw-color-danger-500)',       // Red
  'var(--nw-color-info-500)'          // Light Blue
];

// Custom label renderer for pie charts
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface EquityDistributionChartsProps {
  roleData: any[];
  statusData: any[];
  stakeTypeData: any[];
  investmentTypeData: any[];
  rawInvestments: EquityInvestmentSummary[];
}

export const EquityDistributionCharts: React.FC<EquityDistributionChartsProps> = ({
  roleData,
  statusData,
  stakeTypeData,
  investmentTypeData,
  rawInvestments
}) => {
  // Get available currencies
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(rawInvestments.map(inv => inv.currencyCode || 'EUR'))];
    return currencies.filter(currency => currency).sort();
  }, [rawInvestments]);

  // Currency filters for value charts - dynamic initialization
  const [roleCurrencyFilter, setRoleCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');
  const [statusCurrencyFilter, setStatusCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');
  const [stakeTypeCurrencyFilter, setStakeTypeCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');
  const [investmentTypeCurrencyFilter, setInvestmentTypeCurrencyFilter] = useState(() => availableCurrencies[0] || 'EUR');

  // Set default currency if available
  React.useEffect(() => {
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(roleCurrencyFilter)) {
      setRoleCurrencyFilter(availableCurrencies[0]);
    }
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(statusCurrencyFilter)) {
      setStatusCurrencyFilter(availableCurrencies[0]);
    }
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(stakeTypeCurrencyFilter)) {
      setStakeTypeCurrencyFilter(availableCurrencies[0]);
    }
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(investmentTypeCurrencyFilter)) {
      setInvestmentTypeCurrencyFilter(availableCurrencies[0]);
    }
  }, [availableCurrencies, roleCurrencyFilter, statusCurrencyFilter, stakeTypeCurrencyFilter, investmentTypeCurrencyFilter]);

  // Filtered data for role value chart
  const filteredRoleData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => inv.currencyCode === roleCurrencyFilter);
    return filteredInvestments.reduce((acc: any[], equity: any) => {
      // Get role from investmentRole array (same logic as hook)
      const roles = equity.investment.investmentRole || [];
      const role = roles.length > 0 && roles[0]?.investmentRole?.value 
        ? roles[0].investmentRole.value 
        : 'Unknown';
      
      const existing = acc.find(item => item.role === role);
      if (existing) {
        existing.totalAmount += equity.investment.investmentMarketValue || 0;
      } else {
        acc.push({
          role,
          totalAmount: equity.investment.investmentMarketValue || 0,
          name: role.toLowerCase().replace(/\s+/g, '')
        });
      }
      return acc;
    }, []);
  }, [rawInvestments, roleCurrencyFilter]);

  // Filtered data for status value chart
  const filteredStatusData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => inv.currencyCode === statusCurrencyFilter);
    return filteredInvestments.reduce((acc: any[], equity: any) => {
      const status = equity.investment.investmentStatus?.value || 'Unknown';
      const existing = acc.find(item => item.status === status);
      if (existing) {
        existing.totalAmount += equity.investment.investmentMarketValue || 0;
      } else {
        acc.push({
          status,
          totalAmount: equity.investment.investmentMarketValue || 0,
          name: status.toLowerCase().replace(/\s+/g, '')
        });
      }
      return acc;
    }, []);
  }, [rawInvestments, statusCurrencyFilter]);

  // Filtered data for stake type value chart
  const filteredStakeTypeData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => inv.currencyCode === stakeTypeCurrencyFilter);
    return filteredInvestments.reduce((acc: any[], equity: any) => {
      const stakeType = equity.investment.investmentStakeType?.value || 'Unknown';
      const existing = acc.find(item => item.stakeType === stakeType);
      if (existing) {
        existing.totalAmount += equity.investment.investmentMarketValue || 0;
      } else {
        acc.push({
          stakeType,
          totalAmount: equity.investment.investmentMarketValue || 0
        });
      }
      return acc;
    }, []);
  }, [rawInvestments, stakeTypeCurrencyFilter]);

  // Filtered data for investment type value chart
  const filteredInvestmentTypeData = useMemo(() => {
    const filteredInvestments = rawInvestments.filter(inv => inv.currencyCode === investmentTypeCurrencyFilter);
    return filteredInvestments.reduce((acc: any[], equity: any) => {
      const investmentType = equity.investment.investmentType?.value || 'Unknown';
      const existing = acc.find(item => item.investmentType === investmentType);
      if (existing) {
        existing.totalAmount += equity.investment.investmentMarketValue || 0;
      } else {
        acc.push({
          investmentType,
          totalAmount: equity.investment.investmentMarketValue || 0
        });
      }
      return acc;
    }, []);
  }, [rawInvestments, investmentTypeCurrencyFilter]);

  return (
    <>
      {/* Investment Role Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Investment Role Distribution by Count</CardTitle>
                  <CardDescription>Distribution of equity investments by investment role</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                roleData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [roleData])} 
              className="gba:h-[350px] gba:w-full"
            >
          <PieChart>
            <Pie
                  data={roleData.map((item: any) => ({ 
                    ...item, 
                    name: item.type.toLowerCase().replace(/\s+/g, ''),
                    value: item.count
                  }))}
              cx="50%"
              cy="50%"
              outerRadius={80}
                  fill="var(--color-default)"
              dataKey="value"
                  nameKey="name"
                >
                  {roleData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '');
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Investment Role Distribution by Total Amount ({roleCurrencyFilter})</CardTitle>
                  <CardDescription>Total invested amount by investment role</CardDescription>
                </div>
              </div>
              <Select value={roleCurrencyFilter} onValueChange={setRoleCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                filteredRoleData.forEach((item: any) => {
                  config[item.name] = { label: item.role };
                });
                return config;
              }, [filteredRoleData])} 
              className="gba:h-[350px] gba:w-full"
            >
          <PieChart>
            <Pie
                  data={filteredRoleData}
              cx="50%"
              cy="50%"
              outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="totalAmount"
                  nameKey="name"
            >
                  {filteredRoleData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
              ))}
            </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value, name) => [
                    formatCurrency(value as number, roleCurrencyFilter),
                    name
                  ]} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
            </ChartContainer>
          </CardContent>
      </Card>
      </div>

      {/* Investment Status Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartDonutIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Investment Status Distribution by Count</CardTitle>
                  <CardDescription>Distribution of equity investments by status</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                statusData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [statusData])} 
              className="gba:h-[350px] gba:w-full"
            >
          <PieChart>
            <Pie
                  data={statusData.map((item: any) => ({ 
                    ...item, 
                    name: item.type.toLowerCase().replace(/\s+/g, ''),
                    value: item.count
                  }))}
              cx="50%"
              cy="50%"
              outerRadius={80}
                  fill="var(--color-default)"
              dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '');
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Investment Status Distribution by Total Amount ({statusCurrencyFilter})</CardTitle>
                  <CardDescription>Total invested amount by investment status</CardDescription>
                </div>
              </div>
              <Select value={statusCurrencyFilter} onValueChange={setStatusCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                filteredStatusData.forEach((item: any) => {
                  config[item.name] = { label: item.status };
                });
                return config;
              }, [filteredStatusData])} 
              className="gba:h-[350px] gba:w-full"
            >
          <PieChart>
            <Pie
                  data={filteredStatusData}
              cx="50%"
              cy="50%"
              outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="totalAmount"
                  nameKey="name"
            >
                  {filteredStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
              ))}
            </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value, name) => [
                    formatCurrency(value as number, statusCurrencyFilter),
                    name
                  ]} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
            </ChartContainer>
          </CardContent>
      </Card>
      </div>

      {/* Investment Stake Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={PercentIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Investment Stake Type Distribution by Count</CardTitle>
                  <CardDescription>Distribution of equity investments by stake percentage</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                stakeTypeData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [stakeTypeData])} 
              className="gba:h-[350px] gba:w-full"
            >
            <PieChart>
              <Pie
                  data={stakeTypeData.map((item: any) => ({ 
                    ...item, 
                    name: item.type.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, ''),
                    value: item.count
                  }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                  fill="var(--color-default)"
                dataKey="value"
                  nameKey="name"
                >
                  {stakeTypeData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, '');
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Investment Stake Type Distribution by Total Amount ({stakeTypeCurrencyFilter})</CardTitle>
                  <CardDescription>Total invested amount by stake percentage</CardDescription>
                </div>
              </div>
              <Select value={stakeTypeCurrencyFilter} onValueChange={setStakeTypeCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                filteredStakeTypeData.forEach((item: any) => {
                  const key = item.stakeType.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, '');
                  config[key] = { label: item.stakeType };
                });
                return config;
              }, [filteredStakeTypeData])} 
              className="gba:h-[350px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredStakeTypeData.map((item: any) => ({ 
                    ...item, 
                    name: item.stakeType.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, ''),
                    value: item.totalAmount
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredStakeTypeData.map((entry: any, index: number) => {
                    const key = entry.stakeType.toLowerCase().replace(/\s+/g, '').replace(/[()<>≥%]/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value, name) => [
                    formatCurrency(value as number, stakeTypeCurrencyFilter),
                    name
                  ]} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Investment Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Investment Type Distribution by Count</CardTitle>
                  <CardDescription>Distribution of equity investments by investment type</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                investmentTypeData.forEach((item: any) => {
                  const key = item.type.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.type };
                });
                return config;
              }, [investmentTypeData])} 
              className="gba:h-[350px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={investmentTypeData.map((item: any) => ({ 
                    ...item, 
                    name: item.type.toLowerCase().replace(/\s+/g, ''),
                    value: item.count
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {investmentTypeData.map((entry: any, index: number) => {
                    const key = entry.type.toLowerCase().replace(/\s+/g, '');
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Investment Type Distribution by Total Amount ({investmentTypeCurrencyFilter})</CardTitle>
                  <CardDescription>Total invested amount by investment type</CardDescription>
                </div>
              </div>
              <Select value={investmentTypeCurrencyFilter} onValueChange={setInvestmentTypeCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {};
                filteredInvestmentTypeData.forEach((item: any) => {
                  const key = item.investmentType.toLowerCase().replace(/\s+/g, '');
                  config[key] = { label: item.investmentType };
                });
                return config;
              }, [filteredInvestmentTypeData])} 
              className="gba:h-[350px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredInvestmentTypeData.map((item: any) => ({ 
                    ...item, 
                    name: item.investmentType.toLowerCase().replace(/\s+/g, ''),
                    value: item.totalAmount
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredInvestmentTypeData.map((entry: any, index: number) => {
                    const key = entry.investmentType.toLowerCase().replace(/\s+/g, '');
                    return (
                      <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                    );
                  })}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value, name) => [
                    formatCurrency(value as number, investmentTypeCurrencyFilter),
                    name
                  ]} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}; 