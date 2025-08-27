import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentById } from '@/common/data/investment';

// Import the individual record components
import { EquityRecord } from './components/equity-record';
import { LiquidFundRecord } from './components/liquid-funds-record';
import { RealEstateRecord } from './components/real-estate-record';

interface InvestmentRecordProps extends BusinessAppContextProps {}

const InvestmentRecord: React.FC<InvestmentRecordProps> = (props) => {
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentData, setInvestmentData] = useState<any>(null);
  
  const { fetchInvestmentById } = useGetInvestmentById(props);

  const fetchInvestmentData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestmentById(id);
      
      if (!result.investment) {
        setError('Investment not found');
        return;
      }

      // Store the investment ID and data for routing
      setInvestmentId(id);
      setInvestmentData(result.investment);

    } catch (err) {
      console.error('Error fetching investment data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestmentById]);

  useEffect(() => {
    // Get investmentId from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('investmentId');
    
    if (id) {
      setInvestmentId(id);
      fetchInvestmentData(id);
    } else {
      setError('Investment ID not provided in URL parameters');
      setIsLoading(false);
    }
  }, [fetchInvestmentData]);

  const handleRetry = useCallback(() => {
    if (investmentId) {
      fetchInvestmentData(investmentId);
    }
  }, [investmentId, fetchInvestmentData]);

  // Show loading spinner while fetching investment data
  if (isLoading) {
    return (
      <div 
        className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
        data-testid="investment-record-loading"
      >
        <Spin size="large" />
      </div>
    );
  }

  // Show error message if data fetching failed or investment ID missing
  if (error) {
    return (
      <div 
        className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
        data-testid="investment-record-error"
      >
        <Alert
          message="Error Loading Investment"
          description={error}
          type="error"
          showIcon
          action={
            investmentId && (
              <Button size="small" onClick={handleRetry}>
                Retry
              </Button>
            )
          }
        />
      </div>
    );
  }

  // Route to the appropriate record component based on investment type
  if (!investmentId) {
    return (
      <div 
        className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
        data-testid="investment-record-no-id"
      >
        <Alert
          message="Investment ID Not Found"
          description="Unable to determine the investment ID"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Check if any investment type has data
  const hasEquityData = investmentData?.equityInvestment && Object.keys(investmentData.equityInvestment).length > 0;
  const hasLiquidFundData = investmentData?.liquidFundInvestment && Object.keys(investmentData.liquidFundInvestment).length > 0;
  const hasRealEstateData = investmentData?.realEstateInvestment && Object.keys(investmentData.realEstateInvestment).length > 0;

  // Determine group by catalog code/value
  const groupCode = (investmentData?.investmentGroup?.code || investmentData?.investmentGroupRef || '').toString().toUpperCase();
  const groupLabel = investmentData?.investmentGroup?.value || investmentData?.investmentGroup?.code || 'Investment';

  // If no specialization found, fallback for known groups; else show unsupported
  if (!hasEquityData && !hasLiquidFundData && !hasRealEstateData) {
    const isKnownGroup = ['EQUITY', 'LIQUID_FUND', 'REAL_ESTATE'].some(k => groupCode.includes(k));
    if (isKnownGroup) {
      return (
        <div 
          className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
          data-testid="investment-record-missing-specialization"
        >
          <Alert
            message={`${groupLabel} Record Unavailable`}
            description={`This ${groupLabel.toLowerCase()} investment has no specialization data yet. You can still view basic details, or update the record to add ${groupLabel.toLowerCase()} details.`}
            type="info"
            showIcon
          />
        </div>
      );
    }
    return (
      <div 
        className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
        data-testid="investment-record-unknown-type"
      >
        <Alert
          message="Investment Type Not Supported"
          description="This investment type is not currently supported. Only Equity, Liquid Fund, and Real Estate investments are supported."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Route based on investment type - the specific components will handle their own data fetching
  // We pass the investment ID and let each component determine if it has the right type of data
  
  return (
    <div data-testid="investment-record-container">
      {/* Try each investment type - the component will handle if it has data or not */}
      <EquityRecord {...props} investmentId={investmentId} />
      <LiquidFundRecord {...props} investmentId={investmentId} />
      <RealEstateRecord {...props} investmentId={investmentId} />
    </div>
  );
};

export default InvestmentRecord; 