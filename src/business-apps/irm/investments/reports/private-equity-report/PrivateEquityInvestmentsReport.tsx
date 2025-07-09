import React, { useState } from 'react';
import { Card, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { usePrivateEquityInvestmentIntegration } from './hooks/usePrivateEquityInvestmentIntegration';
import { usePrivateEquityChartData } from './hooks/usePrivateEquityChartData';
import { PrivateEquityKPICards, PrivateEquityCharts } from './components';

const { Title } = Typography;

interface PrivateEquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const PrivateEquityInvestmentsReport: React.FC<PrivateEquityInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'PrivateEquityInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  
  const { privateEquityInvestments, kpis, isLoading, error, refetch } = usePrivateEquityInvestmentIntegration(props);
  const chartData = usePrivateEquityChartData(privateEquityInvestments);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

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
      <PrivateEquityKPICards 
        kpis={kpis} 
        prefixDataTestId={prefixDataTestId} 
      />

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
      <PrivateEquityCharts chartData={chartData} />
    </div>
  );
};

export default PrivateEquityInvestmentsReport; 