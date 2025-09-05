import React, { useState, useCallback, useEffect } from 'react';
import { Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, RealEstateInvestment } from '@/common/data/investment';
import { useRealEstateChartData } from './hooks/useRealEstateChartData';
import { RealEstateKPICards } from './components/RealEstateKPICards';
import { RealEstateCharts } from './components/RealEstateCharts';

const { Title } = Typography;

// Real Estate Investment Summary interface (moved from separate hook)
export interface RealEstateInvestmentSummary {
  id: string;
  investment: Investment;
  realEstateInvestment?: RealEstateInvestment;
  displayName: string;
  statusColor: string;
  riskLevelColor: string;
  currencyCode: string;
  occupancyRate: number;
  isActive: boolean;
  propertyType: string;
  location: string;
}

export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number;
  averageOccupancyRate: number;
  totalUnits: number;
  totalAnnualExpenses: number;
}

// Utility functions (moved from separate hook)
const extractCurrencyCode = (currency: any): string => {
  if (!currency) return 'EUR';
  
  let currencyValue = currency.description || currency.code || currency.id || currency.name || currency;
  
  if (typeof currencyValue === 'string') {
    if (currencyValue.includes(':')) {
      const parts = currencyValue.split(':');
      return parts[parts.length - 1] || 'EUR';
    }
    
    if (currencyValue.length === 3) {
      return currencyValue.toUpperCase();
    }
  }
  
  return 'EUR';
};

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active': return 'green';
    case 'inactive': return 'red';
    case 'pending': return 'orange';
    default: return 'blue';
  }
};

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'green';
    case 'medium': return 'orange';
    case 'high': return 'red';
    default: return 'blue';
  }
};

interface RealEstateInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const RealEstateInvestmentsReport: React.FC<RealEstateInvestmentsReportProps> = (props) => {
  const prefixDataTestId = props.prefixDataTestId || 'RealEstateInvestmentsReport';
  const [searchTerm, setSearchTerm] = useState('');
  
  const [realEstateInvestments, setRealEstateInvestments] = useState<RealEstateInvestmentSummary[]>([]);
  const [kpis, setKpis] = useState<RealEstateInvestmentKPIs>({
    totalPropertyValue: 0,
    averageOccupancyRate: 0,
    totalUnits: 0,
    totalAnnualExpenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(props);

  // Transform real estate data
  const transformRealEstateData = useCallback((investments: Investment[]): RealEstateInvestmentSummary[] => {
    return investments
      .filter(investment => investment.realEstateInvestment && Object.keys(investment.realEstateInvestment).length > 0)
      .map(investment => {
        const realEstateInvestment = investment.realEstateInvestment!;
        
        return {
          id: realEstateInvestment.id,
          investment,
          realEstateInvestment,
          displayName: investment.displayName || investment.name || realEstateInvestment.propertyName || 'Unknown Property',
          statusColor: getStatusColor(investment.investmentStatus?.value || ''),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
          currencyCode: extractCurrencyCode(investment.currency),
          occupancyRate: realEstateInvestment.currentOccupancyRate || 0,
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          propertyType: realEstateInvestment.realEstateType?.value || 'Unknown',
          location: `${realEstateInvestment.country?.value || ''}, ${realEstateInvestment.region?.value || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Unknown Location'
        };
      });
  }, []);

  // Calculate KPIs
  const calculateKPIs = useCallback((realEstateInvestments: RealEstateInvestmentSummary[]): RealEstateInvestmentKPIs => {
    const totalPropertyValue = realEstateInvestments.reduce((sum, property) => 
      sum + (property.investment.investmentMarketValue || property.investment.bookValue || 0), 0
    );
    
    const totalOccupancyRate = realEstateInvestments.reduce((sum, property) => 
      sum + property.occupancyRate, 0
    );
    const averageOccupancyRate = realEstateInvestments.length > 0 ? totalOccupancyRate / realEstateInvestments.length : 0;
    
    const totalUnits = realEstateInvestments.reduce((sum, property) => 
      sum + (property.realEstateInvestment?.numberOfUnits || 1), 0
    );
    
    const totalAnnualExpenses = realEstateInvestments.reduce((sum, property) => 
      sum + (property.realEstateInvestment?.totalAnnualExpenses || 0), 0
    );

    return {
      totalPropertyValue,
      averageOccupancyRate,
      totalUnits,
      totalAnnualExpenses
    };
  }, []);

  // Load data function
  const loadData = useCallback(async () => {
    if (!props.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestments();
      const enhancedRealEstateInvestments = transformRealEstateData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedRealEstateInvestments);
      
      setRealEstateInvestments(enhancedRealEstateInvestments);
      setKpis(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [props.accessToken, fetchInvestments, transformRealEstateData, calculateKPIs]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      loadData();
    }
  }, [props.accessToken, loadData]);

  // Refetch function for error retry
  const refetch = loadData;
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