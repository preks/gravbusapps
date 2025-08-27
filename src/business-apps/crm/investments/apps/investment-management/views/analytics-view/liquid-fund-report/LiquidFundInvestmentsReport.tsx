import React, { useState } from 'react';
import { Tag, Button, Space, Alert, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useLiquidFundInvestmentIntegration } from './hooks/useLiquidFundInvestmentIntegration';
import { useLiquidFundChartData } from './hooks/useLiquidFundChartData';
import { LiquidFundKPICards, LiquidFundCharts } from './components';

const { Title } = Typography;

interface LiquidFundInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const LiquidFundInvestmentsReport: React.FC<LiquidFundInvestmentsReportProps> = ({ 
  prefixDataTestId = 'LiquidFundInvestmentsReport',
  ...context 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    liquidFundInvestments, 
    kpis, 
    isLoading, 
    error, 
    refetch 
  } = useLiquidFundInvestmentIntegration(context, searchTerm);

  const chartData = useLiquidFundChartData(liquidFundInvestments);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

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

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
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
            type="primary" 
            icon={<PlusOutlined />}
            data-testid={formatDataTestId(prefixDataTestId, 'AddButton')}
          >
            Add Liquid Fund
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <LiquidFundKPICards 
        kpis={kpis} 
        prefixDataTestId={`${prefixDataTestId}-KPI`} 
      />

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
      <LiquidFundCharts chartData={chartData} />
    </div>
  );
};

export default LiquidFundInvestmentsReport; 