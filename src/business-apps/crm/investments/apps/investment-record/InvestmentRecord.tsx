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

  // Determine investment type to route to the appropriate component
  const groupCode = (investmentData?.investmentGroup?.code || investmentData?.investmentGroupRef || '').toString().toUpperCase();
  const typeCode = (investmentData?.investmentType?.code || investmentData?.investmentTypeRef || '').toString().toUpperCase();
  const typeName = (investmentData?.investmentType?.value || '').toString().toLowerCase();

  // Helper function to determine which component to render
  const getInvestmentRecordComponent = () => {
    // Check for investment groups first
    if (groupCode.includes('EQUITY')) {
      return <EquityRecord {...props} investmentId={investmentId} />;
    }
    
    if (groupCode.includes('LIQUID_FUND')) {
      return <LiquidFundRecord {...props} investmentId={investmentId} />;
    }
    
    if (groupCode.includes('REAL_ESTATE')) {
      // All Real Estate types use the same RealEstateRecord component
      // The component will determine which header to show based on investment type
      return <RealEstateRecord {...props} investmentId={investmentId} />;
    }
    
    // Fallback to equity record for unknown groups
    return <EquityRecord {...props} investmentId={investmentId} />;
  };

  return (
    <div data-testid="investment-record-container">
      {getInvestmentRecordComponent()}
    </div>
  );
};

export default InvestmentRecord; 