import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Alert, Button } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

// Import the individual record components
import { EquityRecord } from './components/equity-record';
import { LiquidFundRecord } from './components/liquid-funds-record';
import { PrivateEquityRecord } from './components/private-equity-record';
import { RealEstateRecord } from './components/real-estate-record';

interface InvestmentRecordProps extends BusinessAppContextProps {}

interface InvestmentGroupData {
  id: string;
  investmentGroup?: {
    id: string;
    code: string;
    value: string;
  };
}

interface SpecificInvestmentData {
  liquidFundId?: string;
  equityInvestmentId?: string;
  privateEquityInvestmentId?: string;
  realEstateInvestmentId?: string;
}

const GET_INVESTMENT_GROUP_QUERY = `
  query GetInvestmentGroup($id: uuid!) {
    Investment(where: { id: { _eq: $id } }) {
      id
      investmentGroup {
        id
        code
        value
      }
    }
  }
`;

const GET_LIQUID_FUND_ID_QUERY = `
  query GetLiquidFundId($investmentId: uuid!) {
    LiquidFundInvestment(where: { investmentId: { _eq: $investmentId } }) {
      id
    }
  }
`;

const GET_EQUITY_INVESTMENT_ID_QUERY = `
  query GetEquityInvestmentId($investmentId: uuid!) {
    EquityInvestment(where: { investmentId: { _eq: $investmentId } }) {
      id
    }
  }
`;

const GET_PRIVATE_EQUITY_ID_QUERY = `
  query GetPrivateEquityId($investmentId: uuid!) {
    PrivateEquityInvestment(where: { investmentId: { _eq: $investmentId } }) {
      id
    }
  }
`;

const GET_REAL_ESTATE_ID_QUERY = `
  query GetRealEstateId($investmentId: uuid!) {
    RealEstateInvestment(where: { investmentId: { _eq: $investmentId } }) {
      id
    }
  }
`;

const InvestmentRecord: React.FC<InvestmentRecordProps> = (props) => {
  const [investmentId, setInvestmentId] = useState<string | null>(null);
  const [investmentType, setInvestmentType] = useState<string | null>(null);
  const [specificEntityData, setSpecificEntityData] = useState<SpecificInvestmentData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const graphqlClient = useGraphQLClient(props.accessToken);

  const fetchInvestmentData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get the investment group
      const result = await graphqlClient.request<{ Investment: InvestmentGroupData[] }>(
        GET_INVESTMENT_GROUP_QUERY,
        { id }
      );
      
      if (!result.Investment || result.Investment.length === 0) {
        setError('Investment not found');
        return;
      }

      const investment = result.Investment[0];
      const typeCode = investment.investmentGroup?.code || investment.investmentGroup?.value || null;
      setInvestmentType(typeCode);

      if (!typeCode) {
        setError('Investment group not found');
        return;
      }

      // Now fetch the specific entity ID based on the investment group
      const groupCode = typeCode.toLowerCase();
      let specificEntityId = null;
      let entityKey = '';

      if (groupCode.includes('liquid') || groupCode.includes('fund')) {
        const liquidResult = await graphqlClient.request<{ LiquidFundInvestment: { id: string }[] }>(
          GET_LIQUID_FUND_ID_QUERY,
          { investmentId: id }
        );
        if (liquidResult.LiquidFundInvestment && liquidResult.LiquidFundInvestment.length > 0) {
          specificEntityId = liquidResult.LiquidFundInvestment[0].id;
          entityKey = 'liquidFundId';
        }
      } else if (groupCode.includes('equity') && !groupCode.includes('private')) {
        const equityResult = await graphqlClient.request<{ EquityInvestment: { id: string }[] }>(
          GET_EQUITY_INVESTMENT_ID_QUERY,
          { investmentId: id }
        );
        if (equityResult.EquityInvestment && equityResult.EquityInvestment.length > 0) {
          specificEntityId = equityResult.EquityInvestment[0].id;
          entityKey = 'equityInvestmentId';
        }
      } else if (groupCode.includes('private') && groupCode.includes('equity')) {
        const privateEquityResult = await graphqlClient.request<{ PrivateEquityInvestment: { id: string }[] }>(
          GET_PRIVATE_EQUITY_ID_QUERY,
          { investmentId: id }
        );
        if (privateEquityResult.PrivateEquityInvestment && privateEquityResult.PrivateEquityInvestment.length > 0) {
          specificEntityId = privateEquityResult.PrivateEquityInvestment[0].id;
          entityKey = 'privateEquityInvestmentId';
        }
      } else if (groupCode.includes('real') && groupCode.includes('estate')) {
        const realEstateResult = await graphqlClient.request<{ RealEstateInvestment: { id: string }[] }>(
          GET_REAL_ESTATE_ID_QUERY,
          { investmentId: id }
        );
        if (realEstateResult.RealEstateInvestment && realEstateResult.RealEstateInvestment.length > 0) {
          specificEntityId = realEstateResult.RealEstateInvestment[0].id;
          entityKey = 'realEstateInvestmentId';
        }
      }

      if (specificEntityId && entityKey) {
        setSpecificEntityData({ [entityKey]: specificEntityId });
      } else {
        setError(`Specific investment entity not found for type: ${typeCode}`);
      }

    } catch (err) {
      console.error('Error fetching investment data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient]);

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

  // Show loading spinner while fetching investment group
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

  // Route to the appropriate record component based on investment group
  if (!investmentType || !investmentId) {
    return (
      <div 
        className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
        data-testid="investment-record-no-type"
      >
        <Alert
          message="Investment Group Not Found"
          description="Unable to determine the group of this investment"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Route based on investment group code/value with specific entity IDs
  const typeCode = investmentType.toLowerCase();
  
  if (typeCode.includes('equity') && !typeCode.includes('private') && specificEntityData.equityInvestmentId) {
    return <EquityRecord {...props} investmentId={specificEntityData.equityInvestmentId} />;
  }
  
  if ((typeCode.includes('liquid') || typeCode.includes('fund')) && specificEntityData.liquidFundId) {
    return <LiquidFundRecord {...props} investmentId={specificEntityData.liquidFundId} />;
  }
  
  if (typeCode.includes('private') && typeCode.includes('equity') && specificEntityData.privateEquityInvestmentId) {
    return <PrivateEquityRecord {...props} investmentId={specificEntityData.privateEquityInvestmentId} />;
  }
  
  if (typeCode.includes('real') && typeCode.includes('estate') && specificEntityData.realEstateInvestmentId) {
    return <RealEstateRecord {...props} investmentId={specificEntityData.realEstateInvestmentId} />;
  }

  // Default fallback if group doesn't match known patterns
  return (
    <div 
      className="gba:bg-gray-50 gba:min-h-screen gba:flex gba:items-center gba:justify-center" 
      data-testid="investment-record-unknown-type"
    >
      <Alert
        message="Unknown Investment Group"
        description={`Investment group "${investmentType}" is not supported`}
        type="warning"
        showIcon
      />
    </div>
  );
};

export default InvestmentRecord; 