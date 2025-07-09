import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, DollarOutlined, BuildOutlined, LineChartOutlined, TeamOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Scatter } from '@ant-design/plots';
import { Bar } from '@ant-design/plots';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useEquityInvestmentIntegration } from './hooks/useEquityInvestmentIntegration';
import { EnhancedEquityInvestmentSummary } from './hooks/useEquityInvestmentIntegration';

const { Title, Text } = Typography;

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  const locale = getCurrentActiveUserLocale();
  
  const { equityInvestments, kpis, isLoading, error, refetch } = useEquityInvestmentIntegration(props);

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
  const roleData = equityInvestments.reduce((acc, equity) => {
    const role = equity.investmentRole?.value || 'Unknown';
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

  const valuationEbitdaData = equityInvestments
    .filter(equity => equity.currentCompanyValuation && equity.lastReportedEbitda)
    .map(equity => ({
      valuation: equity.currentCompanyValuation || 0,
      ebitda: equity.lastReportedEbitda || 0,
      name: equity.displayName || 'Unknown Company',
      currency: equity.currencyCode || 'EUR'
    }));

  const ebitdaMarginData = equityInvestments
    .filter(equity => equity.ebitdaMargin)
    .map(equity => ({
      name: equity.displayName || 'Unknown Company',
      margin: equity.ebitdaMargin || 0,
      color: equity.ebitdaMargin >= 0 ? '#52c41a' : '#ff4d4f'
    }));

  const statusData = equityInvestments.reduce((acc, equity) => {
    const status = equity.investment.investmentStatus?.value || 'Unknown';
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

  const phaseData = equityInvestments.reduce((acc, equity) => {
    const phase = equity.investment.investmentPhase?.value || 'Unknown';
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

  const riskLevelData = equityInvestments.reduce((acc, equity) => {
    const risk = equity.investment.investmentRiskLevel?.value || 'Unknown';
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

  const currencyData = equityInvestments.reduce((acc, equity) => {
    const currency = equity.currencyCode || 'EUR';
    const existing = acc.find(item => item.type === currency);
    if (existing) {
      existing.value += equity.currentCompanyValuation || 0;
    } else {
      acc.push({
        type: currency,
        value: equity.currentCompanyValuation || 0
      });
    }
    return acc;
  }, [] as any[]);

  const roiData = equityInvestments.map(equity => ({
    name: equity.displayName || 'Unknown Company',
    roi: equity.roi || 0,
    color: equity.roi >= 0 ? '#52c41a' : '#ff4d4f'
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
            {getTranslationFromI18nKeyAndLabel('equity.investments.title', 'Equity Investments Report')}
          </Title>
          <Tag color="purple">{equityInvestments.length} {getTranslationFromI18nKeyAndLabel('equity.investments.items', 'equity investments')}</Tag>
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
            {getTranslationFromI18nKeyAndLabel('button.addEquityInvestment', 'Add Equity Investment')}
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
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEquityValue')}
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
                {getTranslationFromI18nKeyAndLabel('kpi.totalEquityValue', 'Total Equity Value')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalEquityValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageCompanyValuation')}
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
                {getTranslationFromI18nKeyAndLabel('kpi.averageCompanyValuation', 'Average Company Valuation')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.averageCompanyValuation)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalEbitda')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <LineChartOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.totalEbitda', 'Total EBITDA')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalEbitda)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-NumberOfEquityInvestments')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#fa8c16', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <TeamOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {getTranslationFromI18nKeyAndLabel('kpi.numberOfEquityInvestments', 'Number of Equity Investments')}
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatNumber(kpis.numberOfEquityInvestments)}
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
            placeholder={getTranslationFromI18nKeyAndLabel('placeholder.searchEquityInvestments', 'Search equity investments...')}
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

        {/* Company Valuation vs EBITDA */}
        <Card title="Company Valuation vs EBITDA" style={{ borderRadius: '8px' }}>
          <Scatter
            data={valuationEbitdaData}
            xField="valuation"
            yField="ebitda"
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
                if (!datum) return { name: 'Unknown Company', value: 'No data available' };
                
                // Handle name - check for null, undefined, empty string, or the string "null"
                let companyName = datum.name;
                if (!companyName || companyName === 'null' || companyName === 'undefined' || companyName.trim() === '') {
                  companyName = 'Unknown Company';
                }
                
                // Handle valuation - check for null, undefined, or zero
                let valuationText = 'N/A';
                if (datum.valuation !== null && datum.valuation !== undefined && datum.valuation !== 0) {
                  valuationText = formatCurrency(datum.valuation);
                } else if (datum.valuation === 0) {
                  valuationText = formatCurrency(0);
                }
                
                // Handle EBITDA - check for null, undefined, or zero
                let ebitdaText = 'N/A';
                if (datum.ebitda !== null && datum.ebitda !== undefined && datum.ebitda !== 0) {
                  ebitdaText = formatCurrency(datum.ebitda);
                } else if (datum.ebitda === 0) {
                  ebitdaText = formatCurrency(0);
                }
                
                return {
                  name: companyName,
                  value: `Valuation: ${valuationText}, EBITDA: ${ebitdaText}`
                };
              }
            }}
            loading={isLoading}
          />
        </Card>

        {/* EBITDA Margin Distribution */}
        <Card title="EBITDA Margin Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={ebitdaMarginData}
            xField="name"
            yField="margin"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatPercentage(v?.margin)
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

export default EquityInvestmentsReport; 