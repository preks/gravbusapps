"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback, Button, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Spinner, Card, CardContent } from '@newwork/nw-design-system';
import { PiUser, PiEnvelope, PiPhone, PiBuilding, PiCalendar, PiMapPin, PiCaretUp, PiCaretDown } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Account } from '../types';
import dayjs from 'dayjs';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface AccountTableProps {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
  total: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'ASC' | 'DESC' | '';
  onSelectAccount?: (account: Account) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void;
  selectedAccountId?: string;
  accessToken: string;
}

const DATA_TEST_ID_PREFIX = 'AccountTable';

/**
 * Table component for displaying accounts with pagination and actions
 */
export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  loading,
  error,
  hasMore,
  loadMore,
  loadPage,
  retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectAccount,
  onPaginationChange,
  onSortingChange,
  selectedAccountId,
  accessToken
}) => {
  const { t } = useTranslation();

  // Get owner display name
  const getOwnerName = (account: Account) => {
    if (account.ownerEmployee?.displayName) {
      return account.ownerEmployee.displayName;
    }
    if (account.ownerEmployee?.firstName || account.ownerEmployee?.lastName) {
      return `${account.ownerEmployee.firstName || ''} ${account.ownerEmployee.lastName || ''}`.trim();
    }
    return '-';
  };

  // Get account type color
  const getTypeColor = (type?: string) => {
    if (!type) return 'gray';
    switch (type.toLowerCase()) {
      case 'customer':
        return 'green';
      case 'prospect':
        return 'blue';
      case 'partner':
        return 'purple';
      case 'competitor':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get industry color
  const getIndustryColor = (industry?: string) => {
    if (!industry) return 'gray';
    switch (industry.toLowerCase()) {
      case 'technology':
        return 'blue';
      case 'finance':
        return 'green';
      case 'healthcare':
        return 'red';
      case 'manufacturing':
        return 'orange';
      case 'retail':
        return 'purple';
      default:
        return 'gray';
    }
  };

  // Handle row click
  const handleRowClick = useCallback((record: Account) => {
    // Navigate to account record page
    const url = buildPlatformUrl('/platform/crm/account-record', { accountId: record.id });
    navigateTo(url);
    
    // Also call the selection callback if provided
    onSelectAccount?.(record);
  }, [onSelectAccount]);

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === 'ASC') {
        onSortingChange(field, 'DESC');
      } else if (sortOrder === 'DESC') {
        onSortingChange('', '');
      } else {
        onSortingChange(field, 'ASC');
      }
    } else {
      onSortingChange(field, 'ASC');
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ASC') return <PiCaretUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'DESC') return <PiCaretDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // Show error state
  if (error) {
    return (
      <div 
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t('account.error.title', 'Error Loading Accounts')}
        </div>
        <div className="gba:text-gray-600 gba:mb-4">
          {error.message}
        </div>
        <Button
          variant="default"
          onClick={retry}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {loading && (
          <div className="gba:flex gba:justify-center gba:p-4">
            <Spinner />
          </div>
        )}
        
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}>ACTIONS</TableHead>
                <TableHead 
                  className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('name')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-company-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('account.company', 'Company')}
                    {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-contact-header`}>
                  {t('account.contact', 'Contact Info')}
                </TableHead>
                <TableHead 
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('account.created', 'Creation Date')}
                    {renderSortIcon('createdAt')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('ownerEmployeeId')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('account.owner', 'Owner')}
                    {renderSortIcon('ownerEmployeeId')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('typeRef')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('account.type', 'Type')}
                    {renderSortIcon('typeRef')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[13%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('industryRef')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-industry-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('account.industry', 'Industry')}
                    {renderSortIcon('industryRef')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((record) => (
                <TableRow 
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${selectedAccountId === record.id ? 'gba:bg-blue-50' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-account-button-${record.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.accountEntity]}
                        externalContextData={{
                          accountId: record.id
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-account`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-company-cell-${record.id}`}>
                    <div 
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-company-name-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-blue-100 gba:rounded-full">
                        <PiBuilding size={20} className="gba:text-blue-600" />
                      </div>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-sm">{record.name || '-'}</span>
                        {record.website && (
                          <span className="gba:text-xs gba:text-gray-500">{record.website}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-contact-cell-${record.id}`}>
                    <div className="gba:space-y-1">
                      {record.email && (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiEnvelope size={14} className="gba:text-gray-400" />
                          <span className="gba:text-sm">{record.email}</span>
                        </div>
                      )}
                      {record.phone && (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiPhone size={14} className="gba:text-gray-400" />
                          <span className="gba:text-sm">{record.phone}</span>
                        </div>
                      )}
                      {!record.email && !record.phone && (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}>
                    {record.createdAt ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={16} className="gba:text-gray-400" />
                        <span className="gba:text-sm">
                          {dayjs(record.createdAt).format('MMM DD, YYYY')}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar size="sm">
                        {record.ownerEmployee?.pictureThumbnail && (
                          <AvatarImage 
                            src={`data:image/gif;base64,${record.ownerEmployee.pictureThumbnail}`} 
                            alt={getOwnerName(record)} 
                          />
                        )}
                        <AvatarFallback>
                          {getOwnerName(record) !== '-' 
                            ? getOwnerName(record).split(' ').map(n => n[0]).join('').toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-sm">{getOwnerName(record)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${record.id}`}>
                    <Badge className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center">
                      {record.type?.value || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-industry-cell-${record.id}`}>
                    <Badge className="gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:flex gba:items-center gba:justify-center">
                      {record.industry?.value || '-'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4" data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}>
        <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} accounts`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}>
            Page {currentPage} of {Math.ceil(total / pageSize)}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
            >
              <span className="gba:sr-only">Go to previous page</span>
              ⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
            >
              <span className="gba:sr-only">Go to next page</span>
              ⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
            >
              <span className="gba:sr-only">Go to last page</span>
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}; 