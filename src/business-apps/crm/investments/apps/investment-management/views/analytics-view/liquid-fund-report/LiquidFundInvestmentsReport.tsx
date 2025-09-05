import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Tag, Button, Space, Alert, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useGetInvestments } from '@/common/data/investment';
import type { Investment, LiquidFundInvestment } from '@/common/data/investment';
import { useLiquidFundChartData } from './hooks/useLiquidFundChartData';
import { LiquidFundKPICards, LiquidFundCharts } from './components';

const { Title } = Typography;

// Liquid Fund Summary interface (moved from separate hook)
export interface LiquidFundInvestmentSummary {
  id: string;
  investment: Investment;
  liquidFundInvestment?: LiquidFundInvestment;
  displayName: string;
  currencyCode: string;
  statusColor: string;
  phaseColor: string;
  riskColor: string;
  fundTypeName: string;
  fundTypeColor: string;
  daysToMaturity: number;
  isNearMaturity: boolean;
}

export interface LiquidFundInvestmentKPIs {
  totalFundValue: number;
  averageInterestRate: number;
  maturingSoon: number;
  earlyTerminationAllowed: number;
}

// Utility functions (moved from separate hook)
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active': return 'green';
    case 'inactive': return 'red';
    case 'pending': return 'orange';
    default: return 'blue';
  }
};

const getPhaseColor = (phase: string): string => {
  switch (phase?.toLowerCase()) {
    case 'growth': return 'green';
    case 'decline': return 'red';
    case 'mature': return 'blue';
    default: return 'gray';
  }
};

const getRiskColor = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'green';
    case 'medium': return 'orange';
    case 'high': return 'red';
    default: return 'blue';
  }
};

const getFrequencyColor = (frequency: string): string => {
  switch (frequency?.toLowerCase()) {
    case 'monthly': return 'blue';
    case 'quarterly': return 'green';
    case 'annually': return 'purple';
    default: return 'gray';
  }
};

const extractCurrencyCode = (currencyValue: string | undefined): string => {
  if (!currencyValue) {
    return 'EUR';
  }

  if (currencyValue.includes(':')) {
    return currencyValue.split(':').pop() || 'EUR';
  }

  const currencyMap: Record<string, string> = {
    'euro': 'EUR',
    'dollar': 'USD',
    'pound': 'GBP',
    'yen': 'JPY',
    'franc': 'CHF'
  };

  if (typeof currencyValue === 'string') {
    const normalizedValue = currencyValue.toLowerCase().trim();
    if (currencyMap[normalizedValue]) {
      return currencyMap[normalizedValue];
    }
    
    if (currencyValue.length === 3) {
      return currencyValue.toUpperCase();
    }
  }
  
  return 'EUR';
};

interface LiquidFundInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const LiquidFundInvestmentsReport: React.FC<LiquidFundInvestmentsReportProps> = ({ 
  prefixDataTestId = 'LiquidFundInvestmentsReport',
  ...context 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [liquidFundInvestments, setLiquidFundInvestments] = useState<LiquidFundInvestmentSummary[]>([]);
  const [kpis, setKpis] = useState<LiquidFundInvestmentKPIs>({
    totalFundValue: 0,
    averageInterestRate: 0,
    maturingSoon: 0,
    earlyTerminationAllowed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(context);

  // Transform liquid fund data
  const transformLiquidFundData = useCallback((investments: Investment[]): LiquidFundInvestmentSummary[] => {
    return investments
      .filter(investment => investment.liquidFundInvestment && Object.keys(investment.liquidFundInvestment).length > 0)
      .map(investment => {
        const liquidFundInvestment = investment.liquidFundInvestment!;
        const daysToMaturity = liquidFundInvestment.maturityDate ? 
          Math.ceil((new Date(liquidFundInvestment.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
          0;
        
        return {
          id: liquidFundInvestment.id,
          investment,
          liquidFundInvestment,
          displayName: investment.displayName || investment.name || liquidFundInvestment.accountNumber || 'Unknown Fund',
          currencyCode: extractCurrencyCode(investment.currency),
          statusColor: getStatusColor(investment.investmentStatus?.value || ''),
          phaseColor: getPhaseColor(investment.investmentPhase?.value || ''),
          riskColor: getRiskColor(investment.investmentRiskLevel?.value || ''),
          fundTypeName: liquidFundInvestment.interestPaymentFrequency?.description || 'Unknown',
          fundTypeColor: getFrequencyColor(liquidFundInvestment.interestPaymentFrequency?.description || ''),
          daysToMaturity,
          isNearMaturity: daysToMaturity <= 30 && daysToMaturity > 0
        };
      });
  }, []);

  // Calculate KPIs
  const calculateKPIs = useCallback((liquidFundInvestments: LiquidFundInvestmentSummary[]): LiquidFundInvestmentKPIs => {
    const totalFundValue = liquidFundInvestments.reduce((sum, fund) => 
      sum + (fund.investment.investmentMarketValue || fund.investment.bookValue || 0), 0
    );
    
    const totalInterestRate = liquidFundInvestments.reduce((sum, fund) => 
      sum + (fund.liquidFundInvestment?.interestRate || 0), 0
    );
    const averageInterestRate = liquidFundInvestments.length > 0 ? totalInterestRate / liquidFundInvestments.length : 0;
    
    const maturingSoon = liquidFundInvestments.filter(fund => 
      fund.isNearMaturity
    ).length;
    
    const earlyTerminationAllowed = liquidFundInvestments.filter(fund => 
      fund.liquidFundInvestment?.earlyTerminationAllowed || false
    ).length;

    return {
      totalFundValue,
      averageInterestRate,
      maturingSoon,
      earlyTerminationAllowed
    };
  }, []);

  // Load data function
  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestments();
      const enhancedLiquidFundInvestments = transformLiquidFundData(result.Investment);
      const calculatedKPIs = calculateKPIs(enhancedLiquidFundInvestments);
      
      setLiquidFundInvestments(enhancedLiquidFundInvestments);
      setKpis(calculatedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, fetchInvestments, transformLiquidFundData, calculateKPIs]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  // Refetch function for error retry
  const refetch = loadData;

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