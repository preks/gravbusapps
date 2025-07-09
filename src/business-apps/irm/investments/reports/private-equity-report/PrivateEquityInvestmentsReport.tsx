import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, FundOutlined, RiseOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Line } from '@ant-design/plots';
import { Bar } from '@ant-design/plots';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { usePrivateEquityInvestmentIntegration } from './hooks/usePrivateEquityInvestmentIntegration';
import { EnhancedPrivateEquityInvestmentSummary } from './hooks/usePrivateEquityInvestmentIntegration';

const { Title, Text } = Typography;

interface PrivateEquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const PrivateEquityInvestmentsReport: React.FC<PrivateEquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'PrivateEquityInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  const locale = getCurrentActiveUserLocale();
  
  const { privateEquityInvestments, kpis, isLoading, error, refetch } = usePrivateEquityInvestmentIntegration(props);

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
  const roleData = privateEquityInvestments.reduce((acc, pe) => {
    const role = pe.investmentRole?.value || 'Unknown';
    const existing = acc.find(item => item.type === role);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: role,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const statusData = privateEquityInvestments.reduce((acc, pe) => {
    const status = pe.investment.investmentStatus?.value || 'Unknown';
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

  const phaseData = privateEquityInvestments.reduce((acc, pe) => {
    const phase = pe.investment.investmentPhase?.value || 'Unknown';
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

  const riskLevelData = privateEquityInvestments.reduce((acc, pe) => {
    const risk = pe.investment.investmentRiskLevel?.value || 'Unknown';
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

  const currencyData = privateEquityInvestments.reduce((acc, pe) => {
    const currency = pe.currencyCode || 'EUR';
    const existing = acc.find(item => item.type === currency);
    if (existing) {
      existing.value += pe.investment.marketValue || pe.investment.bookValue || 0;
    } else {
      acc.push({
        type: currency,
        value: pe.investment.marketValue || pe.investment.bookValue || 0
      });
    }
    return acc;
  }, [] as any[]);

  const valueOverTimeData = privateEquityInvestments
    .filter(pe => pe.investment.acquisitionDate && pe.investment.marketValue)
    .map(pe => ({
      date: dayjs(pe.investment.acquisitionDate).format('YYYY-MM'),
      value: pe.investment.marketValue || 0,
      name: pe.displayName
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const roiData = privateEquityInvestments.map(pe => ({
    name: pe.displayName,
    roi: pe.roi || 0,
    color: pe.roi >= 0 ? '#52c41a' : '#ff4d4f'
  }));

  const stakeData = privateEquityInvestments
    .filter(pe => pe.investment.stakePercent)
    .map(pe => ({
      name: pe.displayName,
      stake: pe.investment.stakePercent || 0,
      color: pe.statusColor
    }));

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
            {getTranslationFromI18nKeyAndLabel('privateEquity.investments.title', 'Private Equity Investments Report')}
          </Title>
          <Tag color="magenta">{privateEquityInvestments.length} {getTranslationFromI18nKeyAndLabel('privateEquity.investments.items', 'PE investments')}</Tag>
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
            {getTranslationFromI18nKeyAndLabel('button.addPrivateEquityInvestment', 'Add PE Investment')}
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
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalPEValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#eb2f96', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <FundOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalPEValue', 'Total PE Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalPEValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-InvestmentCount')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BarChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.investmentCount', 'Investment Count')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.investmentCount)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageStake')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <TeamOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.averageStake', 'Average Stake')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatPercentage(kpis.averageStake)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-ActiveDeals')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <RiseOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.activeDeals', 'Active Deals')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.activeDeals)}
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
            placeholder={getTranslationFromI18nKeyAndLabel('placeholder.searchPrivateEquityInvestments', 'Search private equity investments...')}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Investment Role Distribution */}
        <Card title="Investment Role Distribution" style={{ borderRadius: '8px' }}>
          <Pie
            data={roleData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = roleData.reduce((sum, item) => sum + (item.value || 0), 0);
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

        {/* Stake Percentage Distribution */}
        <Card title="Stake Percentage Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={stakeData}
            xField="name"
            yField="stake"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatPercentage(v?.stake)
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
      </div>
    </div>
  );
};

export default PrivateEquityInvestmentsReport; 