import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Droplets } from 'lucide-react';
import { formatPercentage } from '../../../utils/formatters';
import type { LiquidFundInvestmentData } from '../types';

interface LiquidFundDetailsProps {
  liquidFundData: LiquidFundInvestmentData | null;
}

const LiquidFundDetails: React.FC<LiquidFundDetailsProps> = ({ liquidFundData }) => {
  if (!liquidFundData) {
    return null;
  }
  const { liquidFundInvestment, investment } = liquidFundData;
  
  // Helper function to format reference values for display
  const formatReferenceValue = (refValue: string): string => {
    // Convert reference values like "MONEY_MARKET" to "Money Market"
    return refValue.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Droplets className="gba:h-5 gba:w-5 gba:text-teal-600" />
          Liquid Fund Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Account Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {liquidFundInvestment?.bankAccountNumber || ''}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Fund Type</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {formatReferenceValue(investment.investmentType?.code || investment.investmentTypeLabel || '')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Interest Rate</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {formatPercentage(liquidFundInvestment?.interestRate || 0)}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Payment Frequency</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {formatReferenceValue(liquidFundInvestment?.interestPaymentFrequency?.code || '')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Maturity Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {liquidFundInvestment?.maturityDate ? new Date(liquidFundInvestment.maturityDate).toLocaleDateString('de-DE') : ''}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Early Termination</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {liquidFundInvestment?.earlyTerminationAllowed ? 'Allowed' : 'Not Allowed'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Risk Level</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {formatReferenceValue(investment.investmentRiskLevel?.code || '')}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Duration</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {liquidFundInvestment?.maturityDate ? Math.floor((new Date(liquidFundInvestment.maturityDate).getTime() - new Date().getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0} years remaining
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Liquidity</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *High
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Capital Preservation</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Guaranteed
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Minimum Investment</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *€100,000
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Fund Category</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Institutional
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiquidFundDetails; 