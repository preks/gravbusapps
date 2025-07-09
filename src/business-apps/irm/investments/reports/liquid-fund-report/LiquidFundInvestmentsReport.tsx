import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Row, Col, Statistic, Spin } from 'antd';
import { PlusOutlined, ReloadOutlined, BankOutlined, PercentageOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Bar } from '@ant-design/plots';
import { Typography } from 'antd';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useLiquidFundInvestmentIntegration } from './hooks/useLiquidFundInvestmentIntegration';

const { Title, Text } = Typography;

interface LiquidFundInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const LiquidFundInvestmentsReport: React.FC<LiquidFundInvestmentsReportProps> = ({ 
  prefixDataTestId = 'LiquidFundInvestmentsReport',
  ...context 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const locale = getCurrentActiveUserLocale();
  
  const { 
    liquidFundInvestments, 
    kpis, 
    isLoading, 
    error, 
    refetch 
  } = useLiquidFundInvestmentIntegration(context, searchTerm);

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
  const interestRateData = liquidFundInvestments.map(fund => ({
    name: fund.displayName,
    value: fund.interestRate || 0,
    color: fund.fundTypeColor
  }));

  const maturityTimelineData = liquidFundInvestments
    .filter(fund => fund.maturityDate)
    .map(fund => ({
      name: fund.displayName,
      maturityYear: dayjs(fund.maturityDate).year(),
      value: fund.investment.marketValue || fund.investment.bookValue || 0,
      isNearMaturity: fund.isNearMaturity
    }))
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.maturityYear === curr.maturityYear);
      if (existing) {
        existing.value += curr.value;
        existing.count += 1;
      } else {
        acc.push({
          maturityYear: curr.maturityYear,
          value: curr.value,
          count: 1
        });
      }
      return acc;
    }, [] as any[]);

  const paymentFrequencyData = liquidFundInvestments.reduce((acc, fund) => {
    const frequency = fund.fundTypeName || 'Unknown';
    const existing = acc.find(item => item.type === frequency);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        type: frequency,
        value: 1
      });
    }
    return acc;
  }, [] as any[]);

  const earlyTerminationData = [
    {
      type: 'Allowed',
      value: liquidFundInvestments.filter(fund => fund.earlyTerminationAllowed).length
    },
    {
      type: 'Not Allowed',
      value: liquidFundInvestments.filter(fund => !fund.earlyTerminationAllowed).length
    }
  ];

  const statusData = liquidFundInvestments.reduce((acc, fund) => {
    const status = fund.investment.investmentStatus?.value || 'Unknown';
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

  const phaseData = liquidFundInvestments.reduce((acc, fund) => {
    const phase = fund.investment.investmentPhase?.value || 'Unknown';
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

  const riskLevelData = liquidFundInvestments.reduce((acc, fund) => {
    const risk = fund.investment.investmentRiskLevel?.value || 'Unknown';
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

  const currencyData = liquidFundInvestments.reduce((acc, fund) => {
    const currency = fund.currencyCode || 'EUR';
    const existing = acc.find(item => item.type === currency);
    if (existing) {
      existing.value += fund.investment.marketValue || fund.investment.bookValue || 0;
    } else {
      acc.push({
        type: currency,
        value: fund.investment.marketValue || fund.investment.bookValue || 0
      });
    }
    return acc;
  }, [] as any[]);

  if (error) {
    return (
      <Alert
        message="Error Loading Liquid Fund Investments"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'LiquidFundInvestmentsReport')}
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
            Liquid Fund Investments Report
          </Title>
          <Tag color="blue">{liquidFundInvestments.length} funds</Tag>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => refetch()}
            loading={isLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'RefreshButton')}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
          >
            Add Liquid Fund
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
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-TotalFundValue')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#1890ff', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <BankOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Total Fund Value
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(kpis.totalFundValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-AverageInterestRate')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#52c41a', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <PercentageOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Average Interest Rate
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatPercentage(kpis.averageInterestRate)}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-MaturingSoon')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#faad14', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <CalendarOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Maturing Soon
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {kpis.maturingSoon}
              </div>
            </div>
          </div>
        </Card>

        <Card
          data-testid={formatDataTestId(prefixDataTestId, 'KPICard-EarlyTerminationAllowed')}
          style={{ borderRadius: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: '#722ed1', 
              borderRadius: '8px', 
              padding: '12px',
              color: 'white'
            }}>
              <CheckCircleOutlined style={{ fontSize: '24px' }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Early Termination Allowed
              </Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                {kpis.earlyTerminationAllowed}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ width: '300px' }}>
          <DebouncedInput
            placeholder="Search liquid fund investments..."
            value={searchTerm}
            onChange={handleSearch}
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
          />
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Interest Rate Distribution */}
        <Card title="Interest Rate Distribution" style={{ borderRadius: '8px' }}>
          <Column
            data={interestRateData}
            xField="name"
            yField="value"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatPercentage(v?.value)
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

        {/* Maturity Timeline */}
        <Card title="Maturity Timeline" style={{ borderRadius: '8px' }}>
          <Column
            data={maturityTimelineData}
            xField="maturityYear"
            yField="value"
            height={300}
            label={{
              position: 'top',
              style: { fill: '#000000', opacity: 0.8 },
              formatter: (v: any) => formatCurrency(v?.value)
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatCurrency(parseFloat(v))
              }
            }}
            loading={isLoading}
          />
        </Card>

        {/* Payment Frequency Distribution */}
        <Card title="Interest Payment Frequency" style={{ borderRadius: '8px' }}>
          <Pie
            data={paymentFrequencyData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = paymentFrequencyData.reduce((sum, item) => sum + (item.value || 0), 0);
                if (total === 0) return datum.type;
                return `${datum.type} ${((datum.value / total) * 100).toFixed(1)}%`;
              }
            }}
            interactions={[{ type: 'element-active' }]}
            loading={isLoading}
          />
        </Card>

        {/* Early Termination Status */}
        <Card title="Early Termination Status" style={{ borderRadius: '8px' }}>
          <Pie
            data={earlyTerminationData}
            angleField="value"
            colorField="type"
            radius={0.8}
            height={300}
            label={{
              formatter: (datum: any) => {
                if (!datum || !datum.type || !datum.value) return '';
                const total = earlyTerminationData.reduce((sum, item) => sum + (item.value || 0), 0);
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
      </div>
    </div>
  );
};

export default LiquidFundInvestmentsReport; 