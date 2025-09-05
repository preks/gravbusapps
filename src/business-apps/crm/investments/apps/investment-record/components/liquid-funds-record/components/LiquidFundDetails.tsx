import React from 'react';
import { BankDepositsDetails, FixedTermDepositsDetails, OtherLiquidFundsDetails } from './';
import type { LiquidFundInvestmentData } from '../types';

interface LiquidFundDetailsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const LiquidFundDetails: React.FC<LiquidFundDetailsProps> = ({ liquidFundData }) => {
  if (!liquidFundData) {
    return null;
  }

  const { liquidFundInvestment } = liquidFundData;
  
  // Determine liquid fund type based on investmentLiquidFundTypeRef
  const liquidFundType = liquidFundInvestment?.investmentLiquidFundTypeRef;
  
  // Route to appropriate component based on liquid fund type
  switch (liquidFundType) {
    case 'InvestmentLiquidFundType:v1:BANK_DEPOSITE':
      return <BankDepositsDetails liquidFundData={liquidFundData} />;
    
    case 'InvestmentLiquidFundType:v1:FIXED_TERM_DEPOSIT':
      return <FixedTermDepositsDetails liquidFundData={liquidFundData} />;
    
    case 'InvestmentLiquidFundType:v1:PENSION_FUNDS':
    case 'InvestmentLiquidFundType:v1:MONEY_MARKET_FUNDS':
    case 'InvestmentLiquidFundType:v1:EQUITY':
    case 'InvestmentLiquidFundType:v1:BONDS':
      return <OtherLiquidFundsDetails liquidFundData={liquidFundData} />;
    
    default:
      // Fallback to OtherLiquidFundsDetails for unknown types
      return <OtherLiquidFundsDetails liquidFundData={liquidFundData} />;
  }
};

export default LiquidFundDetails; 