"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback, Button, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Spinner, Card, CardContent } from '@newwork/nw-design-system';
import { PiUser, PiEnvelope, PiPhone, PiBuilding, PiCalendar, PiMapPin, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Lead } from '../types';
import dayjs from 'dayjs';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { getLeadStatusBadgeVariant, getLeadRatingBadgeVariant } from '@/common/utils/badgeUtils';

interface LeadTableProps {
  leads: Lead[];
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
  onSelectLead?: (lead: Lead) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void;
  selectedLeadId?: string;
  accessToken: string;
  sourceApp?: string;
}

const DATA_TEST_ID_PREFIX = 'LeadTable';

/**
 * Table component for displaying leads with pagination and actions
 */
export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
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
  onSelectLead,
  onPaginationChange,
  onSortingChange,
  selectedLeadId,
  accessToken,
  sourceApp
}) => {
  const { t } = useTranslation();

  // Get contact display name
  const getContactName = (lead: Lead) => {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    }
    return '-';
  };

  // Get contact email
  const getContactEmail = (lead: Lead) => {
    return lead.email || '-';
  };

  // Get contact phone
  const getContactPhone = (lead: Lead) => {
    return lead.phoneNumber || '-';
  };

  // Get owner display name
  const getOwnerName = (lead: Lead) => {
    if (lead.ownerEmployee?.displayName) {
      return lead.ownerEmployee.displayName;
    }
    if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
      return `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim();
    }
    return '-';
  };

  // Parse profile picture from JSON
  const getProfilePictureUrl = (picture?: string | null) => {
    if (!picture) return null;
    try {
      const parsed = JSON.parse(picture);
      return parsed.path || null;
    } catch {
      return null;
    }
  };



  // Handle row click
  const handleRowClick = useCallback((record: Lead) => {
    // Navigate to lead record page
    const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: record.id });
    navigateTo(url);
    
    // Also call the selection callback if provided
    onSelectLead?.(record);
  }, [onSelectLead]);

  // Show error state
  if (error) {
    return (
      <div 
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t('lead.error.title', 'Error Loading Leads')}
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
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

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
                  onClick={() => handleSort('firstName')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.contact', 'Lead Contact')}
                    {renderSortIcon('firstName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('accountName')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-lead-company-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.company', 'Company & Industry')}
                    {renderSortIcon('accountName')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.created', 'Created')}
                    {renderSortIcon('createdAt')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('ownerEmployeeId')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.owner', 'Owner')}
                    {renderSortIcon('ownerEmployeeId')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('leadStatusRef')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.status', 'Status')}
                    {renderSortIcon('leadStatusRef')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('leadRatingRef')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-rating-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t('lead.rating', 'Rating')}
                    {renderSortIcon('leadRatingRef')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((record) => (
                <TableRow 
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${selectedLeadId === record.id ? 'gba:bg-blue-50' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-lead-button-${record.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.leadEntity]}
                        externalContextData={{
                          leadId: record.id
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-lead`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-cell-${record.id}`}>
                    <div 
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-lead-contact-name-${record.id}`}
                    >
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getContactName(record) !== '-' 
                            ? getContactName(record).split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : 'L'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:font-medium gba:text-sm">
                          {getContactName(record)}
                        </div>
                        {record.companyName && (
                          <div className="gba:text-xs gba:text-gray-500">
                            {record.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-lead-company-cell-${record.id}`}>
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiBuilding size={14} className="gba:text-gray-400" />
                        <span className="gba:font-medium gba:text-sm">{record.companyName || record.account?.name || '-'}</span>
                      </div>
                      {record.companyEmail && (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiEnvelope size={12} className="gba:text-gray-400" />
                          <span className="gba:text-xs gba:text-gray-600">{record.companyEmail}</span>
                        </div>
                      )}
                      {record.companyWebsite && (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-xs gba:text-gray-600">{record.companyWebsite}</span>
                        </div>
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
                    ) : '-'}
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
                          {!record.ownerEmployee?.pictureThumbnail
                            ? (getOwnerName(record) !== '-' ? getOwnerName(record).split(' ').map(n => n[0]).join('').toUpperCase() : 'U')
                            : undefined}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-sm">{getOwnerName(record)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}>
                    <Badge variant={getLeadStatusBadgeVariant(record.leadStatus)}>
                      {record.leadStatus?.value || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-rating-cell-${record.id}`}>
                    <Badge variant={getLeadRatingBadgeVariant(record.leadRating)}>
                      {record.leadRating?.value || '-'}
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
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} leads`}
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