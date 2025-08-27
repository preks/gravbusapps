import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { EnhancedLiquidPortfolio } from '../types/LiquidPortfolioTypes';

interface LiquidPortfolioTableProps {
  portfolios: EnhancedLiquidPortfolio[];
  onRowClick?: (portfolioId: string) => void;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC' | '';
  onSortChange?: (field: string, order: 'ASC' | 'DESC' | '') => void;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPaginationChange?: (page: number, newPageSize?: number) => void;
  accessToken: string;
  'data-testid'?: string;
}

const LiquidPortfolioTable: React.FC<LiquidPortfolioTableProps> = ({
  portfolios,
  onRowClick,
  sortField = '',
  sortOrder = '',
  onSortChange,
  currentPage = 1,
  pageSize = 20,
  total = 0,
  onPaginationChange,
  accessToken,
  'data-testid': dataTestId = 'liquid-portfolio-table'
}) => {

  const handleSort = (fieldName: string) => {
    if (!onSortChange) return;

    if (sortField !== fieldName) {
      onSortChange(fieldName, 'ASC');
    } else {
      if (sortOrder === '') {
        onSortChange(fieldName, 'ASC');
      } else if (sortOrder === 'ASC') {
        onSortChange(fieldName, 'DESC');
      } else {
        onSortChange('', '');
      }
    }
  };

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) {
      return null;
    }
    if (sortOrder === 'ASC') {
      return <PiArrowUp className="gba:h-4 gba:w-4 gba:ml-1" />;
    } else if (sortOrder === 'DESC') {
      return <PiArrowDown className="gba:h-4 gba:w-4 gba:ml-1" />;
    }
    return null;
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
      onClick={() => handleSort(field)}
      data-testid={`${dataTestId}-sort-header-${field}`}
    >
      <div className="gba:flex gba:items-center">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'matured':
        return <Badge variant="default">Matured</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPerformanceBadge = (performance: string, performancePercent: number) => {
    const isPositive = performancePercent >= 0;
    return (
      <div className="gba:flex gba:flex-col gba:items-start">
        <span className={`gba:font-semibold ${isPositive ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
          {performance}
        </span>
        <span className={`gba:text-sm ${isPositive ? 'gba:text-green-500' : 'gba:text-red-500'}`}>
          ({performancePercent >= 0 ? '+' : ''}{performancePercent.toFixed(2)}%)
        </span>
      </div>
    );
  };

  return (
    <div data-testid={dataTestId}>
      <Table>
        <TableHeader>
          <TableRow className="gba:border-b gba:bg-gray-50">
            <SortableHeader field="proprietorName">Proprietor</SortableHeader>
            <SortableHeader field="type">Type</SortableHeader>
            <SortableHeader field="depositName">Deposit</SortableHeader>
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Currency</TableHead>
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Market Value</TableHead>
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Performance</TableHead>
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Status</TableHead>
            <SortableHeader field="portfolioStartDate">Start Date</SortableHeader>
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolios.map((portfolio, index) => (
            <TableRow
              key={portfolio.id}
              className="gba:border-b gba:hover:gba:bg-gray-50 gba:transition-colors gba:cursor-pointer"
              data-testid={`${dataTestId}-row-${index + 1}`}
              onClick={() => onRowClick && onRowClick(portfolio.id)}
            >
              <TableCell className="gba:py-4 gba:px-6">
                <div>
                  <div className="gba:font-semibold gba:text-gray-900 gba:mb-1">{portfolio.proprietorName}</div>
                  <div className="gba:text-sm gba:text-gray-600">{portfolio.group}</div>
                </div>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <span className="gba:font-medium gba:text-gray-900">{portfolio.type}</span>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <span className="gba:font-medium gba:text-gray-900">{portfolio.depositName}</span>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <Badge variant="outline">{portfolio.currency}</Badge>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <span className="gba:font-semibold gba:text-gray-900">{portfolio.marketValue}</span>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                {getPerformanceBadge(portfolio.performance, portfolio.performancePercent)}
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">{getStatusBadge(portfolio.status)}</TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <span className="gba:text-gray-900">{portfolio.startDate}</span>
              </TableCell>
              <TableCell className="gba:py-4 gba:px-6">
                <div className="gba:flex gba:justify-start gba:gap-2">
                  <AppActionButton
                    data-testid={`liquid-portfolio-update-button-${portfolio.id}`}
                    variant="secondary"
                    contextsArray={[FlowContextName.entityContext]}
                    externalContextData={{ entityId: portfolio.id }}
                    prefixDataTestId="liquid-portfolio-update"
                    accessToken={accessToken}
                    emptyStateBehavior="disable"
                    deferMainContextRequestsUntilClick
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LiquidPortfolioTable;


