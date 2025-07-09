import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, PieChartOutlined, FundOutlined, BarChartOutlined, RiseOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Line } from '@ant-design/plots';
import { Bar } from '@ant-design/plots';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useInvestmentPortfolioIntegration } from './hooks/useInvestmentPortfolioIntegration';
import { EnhancedInvestmentSummary } from './hooks/useInvestmentPortfolioIntegration';

const { Title, Text } = Typography;

interface InvestmentPortfolioOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const InvestmentPortfolioOverview: React.FC<InvestmentPortfolioOverviewProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'InvestmentPortfolioOverview';
  const [searchTerm, setSearchTerm] = useState('');
  const locale = getCurrentActiveUserLocale();
  
  const { investments, kpis, isLoading, error, refetch } = useInvestmentPortfolioIntegration(props);

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
  const investmentTypeData = investments.reduce((acc, investment) => {
    const type = investment.investmentType || 'Unknown';
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

  const investmentGroupData = investments.reduce((acc, investment) => {
    const group = investment.investmentGroup || 'Unknown';
    const existing = acc.find(item => item.type === group);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: group,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const statusData = investments.reduce((acc, investment) => {
    const status = investment.investmentStatus || 'Unknown';
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

  const phaseData = investments.reduce((acc, investment) => {
    const phase = investment.investmentPhase || 'Unknown';
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

  const riskLevelData = investments.reduce((acc, investment) => {
    const risk = investment.investmentRiskLevel || 'Unknown';
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

  const currencyData = investments.reduce((acc, investment) => {
    const currency = investment.currencyCode || 'EUR';
    const existing = acc.find(item => item.type === currency);
    if (existing) {
      existing.value += investment.marketValue || investment.bookValue || 0;
    } else {
      acc.push({
        type: currency,
        value: investment.marketValue || investment.bookValue || 0
      });
    }
    return acc;
  }, [] as any[]);

  const roiData = investments.map(investment => ({
    name: investment.displayName || 'Unknown',
    roi: investment.roi || 0,
    color: (investment.roi || 0) >= 0 ? '#52c41a' : '#ff4d4f'
  }));

  const valueOverTimeData = investments
    .filter(investment => investment.acquisitionDate && (investment.marketValue || investment.bookValue))
    .map(investment => ({
      date: dayjs(investment.acquisitionDate).format('YYYY-MM'),
      value: investment.marketValue || investment.bookValue || 0,
      name: investment.displayName || 'Unknown'
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

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
            {getTranslationFromI18nKeyAndLabel('investment.portfolio.title', 'Investment Portfolio Overview')}
          </Title>
          <Tag color="blue">{investments.length} {getTranslationFromI18nKeyAndLabel('investment.portfolio.items', 'investments')}</Tag>
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
            {getTranslationFromI18nKeyAndLabel('button.addInvestment', 'Add Investment')}
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
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPortfolioValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <PieChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalPortfolioValue', 'Total Portfolio Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalPortfolioValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <FundOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalInvestments', 'Total Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.totalInvestments)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageROI')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BarChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.averageROI', 'Average ROI')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatPercentage(kpis.averageROI)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-ActiveInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#722ed1', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <RiseOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.activeInvestments', 'Active Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.activeInvestments)}
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
            placeholder={getTranslationFromI18nKeyAndLabel('placeholder.searchInvestments', 'Search investments...')}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Investment Type Distribution */}
        <Card title="Investment Type Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={investmentTypeData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = investmentTypeData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Investment Group Distribution */}
        <Card title="Investment Group Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={investmentGroupData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = investmentGroupData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
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

        {/* ROI Distribution */}
        <Card title="ROI Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={roiData}
            xField="name"
            yField="roi"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatPercentage(v?.roi)
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

        {/* Investment Value Over Time */}
        <Card title="Investment Value Over Time" style={{ borderRadius: '8px' }}>
          <Line
            data={valueOverTimeData}
            xField="date"
            yField="value"
            colorField="name"
            height={300}
            xAxis={{
              label: {
                autoRotate: false,
                autoHide: true,
                style: { fontSize: '12px' }
              }
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatCurrency(parseFloat(v))
              }
            }}
            tooltip={{
              formatter: (datum: any) => {
                if (!datum) return { name: 'Unknown Investment', value: 'No data available' };
                const investmentName = datum.name || 'Unknown Investment';
                const investmentValue = datum.value ? formatCurrency(datum.value) : 'N/A';
                return {
                  name: investmentName,
                  value: investmentValue
                };
              }
            }}
            loading={isLoading}
          />
        </Card>
      </div>
    </div>
  );
};

export default InvestmentPortfolioOverview; 