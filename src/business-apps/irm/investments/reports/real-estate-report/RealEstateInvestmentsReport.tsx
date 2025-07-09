import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, HomeOutlined, BarChartOutlined, DollarOutlined, BuildOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Scatter } from '@ant-design/plots';
import { Bar } from '@ant-design/plots';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useRealEstateInvestmentIntegration } from './hooks/useRealEstateInvestmentIntegration';
import { EnhancedRealEstateInvestmentSummary } from './hooks/useRealEstateInvestmentIntegration';

const { Title, Text } = Typography;

interface RealEstateInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const RealEstateInvestmentsReport: React.FC<RealEstateInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'RealEstateInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  const locale = getCurrentActiveUserLocale();
  
  const { realEstateInvestments, kpis, isLoading, error, refetch } = useRealEstateInvestmentIntegration(props);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const formatCurrency = (amount: number | undefined | null, currencyCode: string = 'EUR'): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toFixed(0);
  };

  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value.toFixed(2)}%`;
  };

  // Chart data preparation
  const propertyTypeData = realEstateInvestments.reduce((acc, property) => {
    const type = property.realEstateType?.value || 'Unknown';
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: type,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const countryData = realEstateInvestments.reduce((acc, property) => {
    const country = property.country?.value || 'Unknown';
    const existing = acc.find(item => item.type === country);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: country,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const occupancyData = realEstateInvestments.map(property => ({
    name: property.displayName || 'Unknown Property',
    occupancy: property.occupancyPercent || 0,
    color: property.occupancyColor
  }));

  const expensesValueData = realEstateInvestments
    .filter(property => 
      property.annualExpenses !== null && 
      property.annualExpenses !== undefined && 
      !isNaN(Number(property.annualExpenses)) &&
      Number(property.annualExpenses) >= 0 &&
      property.investment?.marketValue !== null && 
      property.investment?.marketValue !== undefined && 
      !isNaN(Number(property.investment?.marketValue)) &&
      Number(property.investment?.marketValue) >= 0
    )
    .map(property => ({
      expenses: Number(property.annualExpenses) || 0,
      value: Number(property.investment.marketValue) || 0,
      name: property.displayName || 'Unknown Property',
      currency: property.currencyCode || 'EUR'
    }));

  const buildingYearData = realEstateInvestments
    .filter(property => property.buildingYear)
    .reduce((acc, property) => {
      const year = property.buildingYear || 'Unknown';
      const existing = acc.find(item => item.year === year);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          year: year,
          count: 1
        });
      }
      return acc;
    }, [] as any[]);

  const statusData = realEstateInvestments.reduce((acc, property) => {
    const status = property.investment.investmentStatus?.value || 'Unknown';
    const existing = acc.find(item => item.type === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: status,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const phaseData = realEstateInvestments.reduce((acc, property) => {
    const phase = property.investment.investmentPhase?.value || 'Unknown';
    const existing = acc.find(item => item.type === phase);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: phase,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const riskLevelData = realEstateInvestments.reduce((acc, property) => {
    const risk = property.investment.investmentRiskLevel?.value || 'Unknown';
    const existing = acc.find(item => item.type === risk);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: risk,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const currencyData = realEstateInvestments.reduce((acc, property) => {
    const currency = property.currencyCode || 'EUR';
    const existing = acc.find(item => item.type === currency);
    if (existing) {
      existing.value += property.investment.marketValue || property.investment.bookValue || 0;
    } else {
      acc.push({
        type: currency,
        value: property.investment.marketValue || property.investment.bookValue || 0
      });
    }
    return acc;
  }, [] as any[]);

  if (isLoading) {
    return (
      <div
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        data-testid={formatDataTestId(prefixDataTestId, 'Error')}
        message={getTranslationFromI18nKeyAndLabel('error.loading', 'Error Loading Data')}
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      style={{
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            {getTranslationFromI18nKeyAndLabel('realEstate.investments.title', 'Real Estate Investments Report')}
          </Title>
          <Tag color="orange">{realEstateInvestments.length} {getTranslationFromI18nKeyAndLabel('realEstate.investments.items', 'properties')}</Tag>
        </div>
        <Space>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'RefreshButton')}
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            {getTranslationFromI18nKeyAndLabel('button.refresh', 'Refresh')}
          </Button>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
            type="primary"
            icon={<PlusOutlined />}
          >
            {getTranslationFromI18nKeyAndLabel('button.addRealEstateInvestment', 'Add Real Estate Investment')}
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPropertyValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <HomeOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalPropertyValue', 'Total Property Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalPropertyValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageOccupancyRate')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BarChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatPercentage(kpis.averageOccupancyRate)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalUnits')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BuildOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalUnits', 'Total Units')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.totalUnits)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalAnnualExpenses')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#722ed1', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <DollarOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalAnnualExpenses', 'Total Annual Expenses')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalAnnualExpenses)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ width: '300px' }}>
          <DebouncedInput
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
            placeholder={getTranslationFromI18nKeyAndLabel('placeholder.searchRealEstateInvestments', 'Search real estate investments...')}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Property Type Distribution */}
        <Card title="Property Type Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={propertyTypeData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = propertyTypeData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Properties by Country */}
        <Card title="Properties by Country" style={{ borderRadius: '8px' }}>
          <Pie
            data={countryData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = countryData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Occupancy Rate Distribution */}
        <Card title="Occupancy Rate Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={occupancyData}
            xField="name"
            yField="occupancy"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatPercentage(v?.occupancy)
            }}
            xAxis={{
              label: {
                autoRotate: false,
                autoHide: true,
                style: { fontSize: '12px' }
              }
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatPercentage(parseFloat(v))
              }
            }}
            loading={isLoading}
          />
        </Card>

        {/* Annual Expenses vs Property Value */}
        <Card title="Annual Expenses vs Property Value" style={{ borderRadius: '8px' }}>
          <Scatter
            data={expensesValueData}
            xField="value"
            yField="expenses"
            colorField="name"
            size={5}
            height={300}
            xAxis={{
              label: {
                formatter: (v: string) => formatCurrency(parseFloat(v))
              }
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatCurrency(parseFloat(v))
              }
            }}
            tooltip={{
              formatter: (datum: any) => {
                if (!datum) return { name: 'Unknown Property', value: 'No data available' };
                
                // Handle name - check for null, undefined, empty string, or the string "null"
                let propertyName = datum.name;
                if (!propertyName || propertyName === 'null' || propertyName === 'undefined' || propertyName.trim() === '') {
                  propertyName = 'Unknown Property';
                }
                
                // Handle market value - check for null, undefined, zero, or string "null"
                let marketValueText = 'N/A';
                if (datum.value !== null && datum.value !== undefined && datum.value !== 'null' && !isNaN(Number(datum.value))) {
                  const numValue = Number(datum.value);
                  if (numValue !== 0) {
                    marketValueText = formatCurrency(numValue);
                  } else {
                    marketValueText = formatCurrency(0);
                  }
                }
                
                // Handle annual expenses - check for null, undefined, zero, or string "null"
                let expensesText = 'N/A';
                if (datum.expenses !== null && datum.expenses !== undefined && datum.expenses !== 'null' && !isNaN(Number(datum.expenses))) {
                  const numExpenses = Number(datum.expenses);
                  if (numExpenses !== 0) {
                    expensesText = formatCurrency(numExpenses);
                  } else {
                    expensesText = formatCurrency(0);
                  }
                }
                
                return {
                  name: propertyName,
                  value: `Market Value: ${marketValueText}, Annual Expenses: ${expensesText}`
                };
              }
            }}
            loading={isLoading}
          />
        </Card>

        {/* Building Year Distribution */}
        <Card title="Building Year Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={buildingYearData}
            xField="year"
            yField="count"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 }
            }}
            xAxis={{
              label: {
                autoRotate: false,
                autoHide: true,
                style: { fontSize: '12px' }
              }
            }}
            loading={isLoading}
          />
        </Card>

        {/* Investment Status Distribution */}
        <Card title="Investment Status Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={statusData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = statusData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Investment Phase Distribution */}
        <Card title="Investment Phase Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={phaseData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = phaseData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Risk Level Distribution */}
        <Card title="Risk Level Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={riskLevelData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = riskLevelData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Currency Distribution */}
        <Card title="Investment Value by Currency" style={{ borderRadius: '8px' }}>
          <Pie
            data={currencyData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = currencyData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>
      </div>
    </div>
  );
};

export default RealEstateInvestmentsReport; 