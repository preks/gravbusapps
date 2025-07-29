import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { EnhancedInvestment } from '../hooks/useInvestmentDataIntegration';
import { getStatusBadge } from '../utils/helpers';

interface LiquidFundsTableProps {
  investments: EnhancedInvestment[];
  onRowClick?: (investmentId: string) => void;
}

const LiquidFundsTable: React.FC<LiquidFundsTableProps> = ({ investments, onRowClick }) => {
  const liquidFundsInvestments = investments.filter(investment => investment.type === 'Liquid Funds');

  if (liquidFundsInvestments.length === 0) {
    return (
      <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid="no-liquid-funds">
        No liquid funds investments found.
      </div>
    );
  }

  const formatCurrency = (amount: number | null, currencyId?: string): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currency = currencyId?.split(':').pop() || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatPercentage = (value: number | null): string => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {/* Basic Investment Info */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:min-w-[200px]">INVESTMENT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">ID</TableHead>
                
                {/* Financial Info */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">INITIAL AMOUNT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">BOOK VALUE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">MARKET VALUE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">TOTAL INVESTMENT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">CURRENCY</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">EXPECTED ROI</TableHead>
                
                {/* Liquid Funds Specific */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">ACCOUNT NUMBER</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">INTEREST RATE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">PAYMENT FREQUENCY</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">MATURITY DATE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">EARLY TERMINATION</TableHead>
                
                {/* Investment Details */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">STAKE %</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">LEVERAGE RATIO</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">DEBT FINANCING</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">INVESTMENT GROUP</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">INVESTMENT PHASE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">RISK LEVEL</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">STATUS</TableHead>
                
                {/* Dates */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">ACQUISITION DATE</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">PLANNED EXIT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">EXIT DATE</TableHead>
                
                {/* Relationships */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">ACCOUNT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">OPPORTUNITY</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">OWNER</TableHead>
                
                {/* System Fields */}
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">CREATED AT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">UPDATED AT</TableHead>
                <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">NOTES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidFundsInvestments.map((investment, index) => {
                const investmentData = investment.rawData.investment;
                const liquidFundData = investment.rawData.specificData;
                
                return (
                  <TableRow 
                    key={investment.id}
                    className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer" 
                    data-testid={`liquid-funds-row-${index + 1}`}
                    onClick={() => onRowClick && onRowClick(investment.rawData.investment.id)}
                  >
                    {/* Basic Investment Info */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <div>
                        <div className="gba:font-semibold gba:text-gray-900 gba:mb-1">{investmentData.name || 'N/A'}</div>
                        <div className="gba:text-sm gba:text-gray-600">{investment.subType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.id || 'N/A'}</span>
                    </TableCell>
                    
                    {/* Financial Info */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {formatCurrency(investmentData.initialInvestmentAmount, investmentData.currency?.id)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <div>
                        <div className="gba:font-semibold gba:text-gray-900 gba:mb-1">
                          {formatCurrency(investmentData.bookValue, investmentData.currency?.id)}
                        </div>
                        <div className="gba:text-sm gba:text-green-600 gba:font-medium">{investment.bookValueChange}</div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {formatCurrency(investmentData.marketValue, investmentData.currency?.id)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {formatCurrency(investmentData.totalInvestmentAmount, investmentData.currency?.id)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.currency?.value || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-green-600">{investment.expectedROI}</span>
                    </TableCell>
                    
                    {/* Liquid Funds Specific */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'accountNumber' in liquidFundData 
                          ? liquidFundData.accountNumber || 'N/A' 
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'interestRate' in liquidFundData 
                          ? formatPercentage(liquidFundData.interestRate) 
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'interestPaymentFrequency' in liquidFundData 
                          ? liquidFundData.interestPaymentFrequency?.value || 'N/A' 
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'maturityDate' in liquidFundData 
                          ? formatDate(liquidFundData.maturityDate || null) 
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'earlyTerminationAllowed' in liquidFundData 
                          ? liquidFundData.earlyTerminationAllowed ? 'Yes' : 'No' 
                          : 'N/A'}
                      </span>
                    </TableCell>
                    
                    {/* Investment Details */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{formatPercentage(investmentData.stakePercent)}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.leverageRatio || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {formatCurrency(investmentData.debtFinancing, investmentData.currency?.id)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.investmentGroup?.value || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.investmentPhase?.value || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.investmentRiskLevel?.value || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      {getStatusBadge(investmentData.investmentStatus?.value || 'N/A')}
                    </TableCell>
                    
                    {/* Dates */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{formatDate(investmentData.acquisitionDate)}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{formatDate(investmentData.plannedExitDate || null)}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{formatDate(investmentData.exitDate || null)}</span>
                    </TableCell>
                    
                    {/* Relationships */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.account?.name || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{investmentData.opportunity?.name || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {investmentData.ownerEmployee 
                          ? `${investmentData.ownerEmployee.firstName} ${investmentData.ownerEmployee.lastName}`
                          : 'N/A'
                        }
                      </span>
                    </TableCell>
                    
                    {/* System Fields */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">{formatDate(investmentData.acquisitionDate)}</span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {liquidFundData && 'synchronizedAt' in liquidFundData 
                          ? formatDate(liquidFundData.synchronizedAt as string || null)
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <div className="gba:max-w-[200px] gba:truncate" title={investmentData.notesSummary || 'N/A'}>
                        <span className="gba:text-gray-900">{investmentData.notesSummary || 'N/A'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiquidFundsTable; 