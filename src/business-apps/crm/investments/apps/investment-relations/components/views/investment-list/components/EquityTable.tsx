import React, { useState } from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { EnhancedInvestment } from '../hooks';
import { getStatusBadge } from '../utils/helpers';

interface EquityTableProps {
  investments: EnhancedInvestment[];
  onRowClick: (equityId: string) => void;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  onSortChange?: (field: string, order: 'ASC' | 'DESC' | '') => void;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPaginationChange?: (page: number, pageSize?: number) => void;
  accessToken: string;
}

const EquityTable: React.FC<EquityTableProps> = ({ 
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

  const equityInvestments = investments.filter(inv => inv.type === 'Equity');

  return (
    <Card data-testid="equity-table-container">
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table data-testid="equity-table">
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {/* Actions */}
                <Header className="gba:w-[60px]" data-testid="equity-actions-header">ACTIONS</Header>
                {/* Basic Investment Info */}
                <SortableHeader field="name" className="gba:min-w-[200px]" data-testid="equity-investment-header">INVESTMENT</SortableHeader>
                <Header data-testid="equity-business-key-header">BUSINESS KEY</Header>
                
                {/* Financial Info */}
                <SortableHeader field="initialInvestmentAmount" data-testid="equity-initial-amount-header">INITIAL AMOUNT</SortableHeader>
                <SortableHeader field="bookValue" data-testid="equity-book-value-header">BOOK VALUE</SortableHeader>
                <SortableHeader field="marketValue" data-testid="equity-market-value-header">MARKET VALUE</SortableHeader>
                <SortableHeader field="totalInvestmentAmount" data-testid="equity-total-investment-header">TOTAL INVESTMENT</SortableHeader>
                <Header data-testid="equity-currency-header">CURRENCY</Header>
                <Header data-testid="equity-expected-roi-header">EXPECTED ROI</Header>
                
                {/* Equity Specific */}
                <SortableHeader field="investmentRoleRef" data-testid="equity-investment-role-header">INVESTMENT ROLE</SortableHeader>
                <SortableHeader field="currentCompanyValuation" data-testid="equity-company-valuation-header">COMPANY VALUATION</SortableHeader>
                <SortableHeader field="lastReportedEbitda" data-testid="equity-last-ebitda-header">LAST EBITDA</SortableHeader>
                <SortableHeader field="lastReportedTurnover" data-testid="equity-last-turnover-header">LAST TURNOVER</SortableHeader>
                
                {/* Investment Details */}
                <SortableHeader field="stakePercent" data-testid="equity-stake-percent-header">STAKE %</SortableHeader>
                <SortableHeader field="leverageRatio" data-testid="equity-leverage-ratio-header">LEVERAGE RATIO</SortableHeader>
                <SortableHeader field="debtFinancing" data-testid="equity-debt-financing-header">DEBT FINANCING</SortableHeader>
                <Header data-testid="equity-investment-group-header">INVESTMENT GROUP</Header>
                <Header data-testid="equity-investment-phase-header">INVESTMENT PHASE</Header>
                <Header data-testid="equity-risk-level-header">RISK LEVEL</Header>
                <Header data-testid="equity-status-header">STATUS</Header>
                
                {/* Dates */}
                <SortableHeader field="acquisitionDate" data-testid="equity-acquisition-date-header">ACQUISITION DATE</SortableHeader>
                <SortableHeader field="plannedExitDate" data-testid="equity-planned-exit-header">PLANNED EXIT</SortableHeader>
                <SortableHeader field="exitDate" data-testid="equity-exit-date-header">EXIT DATE</SortableHeader>
                
                {/* Relationships */}
                <Header data-testid="equity-account-header">ACCOUNT</Header>
                <Header data-testid="equity-opportunity-header">OPPORTUNITY</Header>
                <Header data-testid="equity-owner-header">OWNER</Header>
                
                {/* System Fields */}
                <SortableHeader field="createdAt" data-testid="equity-created-at-header">CREATED AT</SortableHeader>
                <SortableHeader field="updatedAt" data-testid="equity-updated-at-header">UPDATED AT</SortableHeader>
                <Header data-testid="equity-notes-header">NOTES</Header>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equityInvestments.map((investment, index) => {
                const investmentData = investment.rawData.investment;
                const equityData = investment.rawData.specificData;
                
                return (
                  <TableRow 
                    key={investment.id}
                    className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors" 
                    data-testid={`equity-row-${investment.id}`}
                  >
                    {/* Actions */}
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`equity-actions-cell-${investment.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`equity-update-investment-button-${investment.id}`}
                          variant="secondary"
                          contextsArray={[FlowContextName.equityInvestmentEntity]}
                          externalContextData={{
                            investmentId: investment.id
                          }}
                          prefixDataTestId={`equity-update-investment`}
                          accessToken={accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                    {/* Basic Investment Info */}
                    <TableCell className="gba:py-4 gba:px-6" data-testid={`equity-investment-cell-${investment.id}`}>
                      <div 
                        className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(investment.id);
                        }}
                        data-testid={`equity-investment-name-${investment.id}`}
                      >
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
                    
                    {/* Equity Specific */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:text-gray-900">
                        {equityData && 'investmentRole' in equityData ? equityData.investmentRole?.value || 'N/A' : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {equityData && 'currentCompanyValuation' in equityData 
                          ? formatCurrency(equityData.currentCompanyValuation, investmentData.currency?.id)
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {equityData && 'lastReportedEbitda' in equityData 
                          ? formatCurrency(equityData.lastReportedEbitda, investmentData.currency?.id)
                          : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-4 gba:px-6">
                      <span className="gba:font-semibold gba:text-gray-900">
                        {equityData && 'lastReportedTurnover' in equityData 
                          ? formatCurrency(equityData.lastReportedTurnover, investmentData.currency?.id)
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
                        {equityData && 'updatedAt' in equityData 
                          ? formatDate(equityData.updatedAt as string || null)
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
                  data-testid="equity-table-prev-page"
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
                  data-testid="equity-table-next-page"
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

export default EquityTable; 