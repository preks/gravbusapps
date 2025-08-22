import React, { useState } from 'react';
import { Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useRealEstateInvestmentIntegration } from './hooks/useRealEstateInvestmentIntegration';
import { useRealEstateChartData } from './hooks/useRealEstateChartData';
import { RealEstateKPICards } from './components/RealEstateKPICards';
import { RealEstateCharts } from './components/RealEstateCharts';

const { Title } = Typography;

interface RealEstateInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const RealEstateInvestmentsReport: React.FC<RealEstateInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'RealEstateInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  
  const { realEstateInvestments, kpis, isLoading, error, refetch } = useRealEstateInvestmentIntegration(props);
  const chartData = useRealEstateChartData(realEstateInvestments);

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
            {getTranslationFromI18nKeyAndLabel('realEstate.investments.title', 'Real Estate Investments Report')}
          </Title>
          <Tag color="orange">
            {realEstateInvestments.length} {getTranslationFromI18nKeyAndLabel('realEstate.investments.items', 'properties')}
          </Tag>
        </div>
        <Space>
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
      <RealEstateKPICards kpis={kpis} prefixDataTestId={prefixDataTestId} />

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
      <RealEstateCharts chartData={chartData} />
    </div>
  );
};

export default RealEstateInvestmentsReport; 