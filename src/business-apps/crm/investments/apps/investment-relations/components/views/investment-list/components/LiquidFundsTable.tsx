import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { EnhancedInvestment } from '../hooks';
import { getStatusBadge } from '../utils/helpers';

interface LiquidFundsTableProps {
  investments: EnhancedInvestment[];
  onRowClick?: (liquidFundId: string) => void;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  onSortChange?: (field: string, order: 'ASC' | 'DESC' | '') => void;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPaginationChange?: (page: number, pageSize?: number) => void;
  accessToken: string;
}

const LiquidFundsTable: React.FC<LiquidFundsTableProps> = ({ 
  investments, 
  onRowClick,
  sortField = '', 
  sortOrder = '', 
  onSortChange,
  currentPage = 1,
  pageSize = 20,
  total = 0,
  onPaginationChange,
  accessToken
}) => {
  // Handle column sorting with 3 states: none -> ASC -> DESC -> none
  const handleSort = (fieldName: string) => {
    if (!onSortChange) return;

    if (sortField !== fieldName) {
      // New field, start with ASC
      onSortChange(fieldName, 'ASC');
    } else {
      // Same field, cycle through states
      if (sortOrder === '') {
        onSortChange(fieldName, 'ASC');
      } else if (sortOrder === 'ASC') {
        onSortChange(fieldName, 'DESC');
      } else {
        // DESC -> reset to no sorting
        onSortChange('', '');
      }
    }
  };

  // Get sort icon for column header
  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) {
      return null;
    }
    
    if (sortOrder === 'ASC') {
      return <ChevronUp className="gba:h-4 gba:w-4 gba:ml-1" />;
    } else if (sortOrder === 'DESC') {
      return <ChevronDown className="gba:h-4 gba:w-4 gba:ml-1" />;
    }
    
    return null;
  };

  // Create sortable header component
  const SortableHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 ${className}`}
      onClick={() => handleSort(field)}
      data-testid={`sort-header-${field}`}
    >
      <div className="gba:flex gba:items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  // Create non-sortable header component
  const Header = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <TableHead className={`gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 ${className}`}>
      {children}
    </TableHead>
  );

  const formatCurrency = (amount: number | null, currencyId?: string): string => {
    if (amount === null || amount === undefined) return 'N/A';
    
    const currency = currencyId ? currencyId.split(':').pop() || 'EUR' : 'EUR';
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
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const liquidFundsInvestments = investments.filter(inv => inv.type === 'Liquid Funds');

  return (
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {/* Actions */}
                <Header className="gba:w-[60px]">ACTIONS</Header>
                {/* Basic Investment Info */}
                <SortableHeader field="name" className="gba:min-w-[200px]">INVESTMENT</SortableHeader>
                <Header>ID</Header>
                
                {/* Financial Info */}
                <SortableHeader field="initialInvestmentAmount">INITIAL AMOUNT</SortableHeader>
                <SortableHeader field="bookValue">BOOK VALUE</SortableHeader>
                <SortableHeader field="marketValue">MARKET VALUE</SortableHeader>
                <SortableHeader field="totalInvestmentAmount">TOTAL INVESTMENT</SortableHeader>
                <Header>CURRENCY</Header>
                <Header>EXPECTED ROI</Header>
                
                {/* Liquid Funds Specific */}
                <SortableHeader field="accountNumber">ACCOUNT NUMBER</SortableHeader>
                <SortableHeader field="interestRate">INTEREST RATE</SortableHeader>
                <SortableHeader field="interestPaymentFrequencyRef">PAYMENT FREQUENCY</SortableHeader>
                <SortableHeader field="maturityDate">MATURITY DATE</SortableHeader>
                <SortableHeader field="earlyTerminationAllowed">EARLY TERMINATION</SortableHeader>
                
                {/* Investment Details */}
                <SortableHeader field="stakePercent">STAKE %</SortableHeader>
                <SortableHeader field="leverageRatio">LEVERAGE RATIO</SortableHeader>
                <SortableHeader field="debtFinancing">DEBT FINANCING</SortableHeader>
                <Header>INVESTMENT GROUP</Header>
                <Header>INVESTMENT PHASE</Header>
                <Header>RISK LEVEL</Header>
                <Header>STATUS</Header>
                
                {/* Dates */}
                <SortableHeader field="acquisitionDate">ACQUISITION DATE</SortableHeader>
                <SortableHeader field="plannedExitDate">PLANNED EXIT</SortableHeader>
                <SortableHeader field="exitDate">EXIT DATE</SortableHeader>
                
                {/* Relationships */}
                <Header>ACCOUNT</Header>
                <Header>OPPORTUNITY</Header>
                <Header>OWNER</Header>
                
                {/* System Fields */}
                <SortableHeader field="createdAt">CREATED AT</SortableHeader>
                <SortableHeader field="updatedAt">UPDATED AT</SortableHeader>
                <Header>NOTES</Header>
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
                    onClick={() => onRowClick && onRowClick(investment.id)}
                  >
                    {/* Actions */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`liquid-funds-update-investment-button-${investment.id}`}
                          variant="secondary"
                          contextsArray={[FlowContextName.liquidFundInvestmentEntity]}
                          externalContextData={{
                            investmentId: investment.id
                          }}
                          prefixDataTestId={`liquid-funds-update-investment`}
                          accessToken={accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
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
                        {liquidFundData && 'updatedAt' in liquidFundData 
                          ? formatDate(liquidFundData.updatedAt as string || null)
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
        {onPaginationChange && (
          <div className="gba:px-6 gba:py-4 gba:border-t gba:border-gray-200 gba:bg-gray-50">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-sm gba:text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} entries
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <button
                  onClick={() => onPaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="gba:px-3 gba:py-1 gba:border gba:border-gray-300 gba:rounded gba:text-sm gba:bg-white gba:hover:bg-gray-50 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
                  data-testid="liquid-funds-table-prev-page"
                >
                  Previous
                </button>
                <span className="gba:text-sm gba:text-gray-600">
                  Page {currentPage} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => onPaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  className="gba:px-3 gba:py-1 gba:border gba:border-gray-300 gba:rounded gba:text-sm gba:bg-white gba:hover:bg-gray-50 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed"
                  data-testid="liquid-funds-table-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiquidFundsTable; 