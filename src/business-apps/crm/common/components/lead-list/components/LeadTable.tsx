"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button, Tooltip } from '@newwork/gravity-ui-catalog';
import { Badge } from '@newwork/nw-design-system';
import { PiUser, PiEnvelope, PiPhone, PiBuilding, PiCalendar, PiMapPin } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Lead } from '../types';
import dayjs from 'dayjs';

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
  sortOrder: 'ASC' | 'DESC';
  onSelectLead?: (lead: Lead) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC') => void;
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

  // Get rating badge styling based on value
  const getRatingBadgeClass = (rating?: string) => {
    if (!rating) return 'gba:!bg-gray-100 gba:!text-gray-700 gba:!border-gray-200';
    switch (rating.toLowerCase()) {
      case 'cold':
        return 'gba:!bg-blue-100 gba:!text-blue-700 gba:!border-blue-200';
      case 'warm':
        return 'gba:!bg-orange-100 gba:!text-orange-700 gba:!border-orange-200';
      case 'hot':
        return 'gba:!bg-red-100 gba:!text-red-700 gba:!border-red-200';
      default:
        return 'gba:!bg-gray-100 gba:!text-gray-700 gba:!border-gray-200';
    }
  };

  // Get lead status badge styling
  const getStatusBadgeClass = (status?: string) => {
    if (!status) return 'gba:!bg-gray-100 gba:!text-gray-700 gba:!border-gray-200';
    switch (status.toLowerCase()) {
      case 'new':
      case 'open':
        return 'gba:!bg-blue-100 gba:!text-blue-700 gba:!border-blue-200';
      case 'qualified':
      case 'contacted':
        return 'gba:!bg-green-100 gba:!text-green-700 gba:!border-green-200';
      case 'unqualified':
      case 'lost':
        return 'gba:!bg-red-100 gba:!text-red-700 gba:!border-red-200';
      case 'converted':
        return 'gba:!bg-green-100 gba:!text-green-700 gba:!border-green-200';
      default:
        return 'gba:!bg-gray-100 gba:!text-gray-700 gba:!border-gray-200';
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('Table changed:', { 
      pagination,
      filters,
      sorter
    });
    
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    
    // Handle pagination change
    if (pagination.current !== currentPage || pagination.pageSize !== pageSize) {
      onPaginationChange(targetPage, targetPageSize);
    }
  };

  // Handle sorting change (using DataTable's specific onSorterChange prop)
  const handleSorterChange = (sorter: any) => {
    console.log('Sorter changed:', sorter);
    
    if (sorter.field && sorter.order) {
      // Sort order is set (ASC or DESC)
      const field = Array.isArray(sorter.field) ? sorter.field[0] : sorter.field;
      const order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
      
      if (field !== sortField || order !== sortOrder) {
        onSortingChange(field, order);
      }
    } else  {
      // Sort order is null - this means cancel sorting
      // Reset to default sorting (createdAt DESC)
      if (sortField !== 'createdAt' || sortOrder !== 'DESC') {
        onSortingChange('createdAt', 'DESC');
      }
    }
  };

  // Helper function to determine if a column should show sorting indicator
  // Only show indicator if user has explicitly sorted (not default createdAt DESC)
  const getSortOrder = (columnField: string) => {
    // If this is the default state (createdAt DESC), don't show any indicators
    if (sortField === 'createdAt' && sortOrder === 'DESC' && columnField === 'createdAt') {
      return false;
    }
    
    // Show indicator only if this column is currently being sorted
    if (sortField === columnField) {
      return sortOrder === 'ASC' ? 'ascend' : 'descend';
    }
    
    return false;
  };

  // Handle row click
  const handleRowClick = useCallback((record: Lead) => {
    onSelectLead?.(record);
  }, [onSelectLead]);

  // Define columns for the table
  const columns: any[] = [
    {
      title: t('lead.contact', 'Contact'),
      dataIndex: 'firstName',
      key: 'firstName',
      sorter: true,
      sortOrder: getSortOrder('firstName'),
      render: (_: any, record: Lead) => {
        const contactName = getContactName(record);
        const contactEmail = getContactEmail(record);
        const contactPhone = getContactPhone(record);
        
        return (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <span className="gba:font-medium gba:text-sm">{contactName}</span>
            {contactEmail !== '-' && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PiEnvelope size={12} className="gba:text-gray-400" />
                <span className="gba:text-xs gba:text-gray-600">{contactEmail}</span>
              </div>
            )}
            {contactPhone !== '-' && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PiPhone size={12} className="gba:text-gray-400" />
                <span className="gba:text-xs gba:text-gray-600">{contactPhone}</span>
              </div>
            )}
          </div>
        );
      },
      width: '20%',
    },
    {
      title: t('lead.company', 'Company'),
      dataIndex: 'companyName',
      key: 'companyName',
      sorter: true,
      sortOrder: getSortOrder('companyName'),
      render: (_: any, record: Lead) => {
        const companyName = record.companyName || record.account?.name || '-';
        const companyEmail = record.companyEmail;
        const companyWebsite = record.companyWebsite;
        
        return (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiBuilding size={14} className="gba:text-gray-400" />
              <span className="gba:font-medium gba:text-sm">{companyName}</span>
            </div>
            {companyEmail && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PiEnvelope size={12} className="gba:text-gray-400" />
                <span className="gba:text-xs gba:text-gray-600">{companyEmail}</span>
              </div>
            )}
            {companyWebsite && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:text-xs gba:text-gray-600">{companyWebsite}</span>
              </div>
            )}
          </div>
        );
      },
      width: '20%',
    },
    {
      title: t('lead.created', 'Creation Date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      sortOrder: getSortOrder('createdAt'),
      render: (_: any, record: Lead) => {
        if (!record.createdAt) return '-';
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar size={16} className="gba:text-gray-400" />
            <span className="gba:text-sm">
              {dayjs(record.createdAt).format('MMM DD, YYYY')}
            </span>
          </div>
        );
      },
      width: '15%',
    },
    {
      title: t('lead.owner', 'Owner'),
      dataIndex: 'ownerEmployeeId',
      key: 'ownerEmployeeId',
      sorter: true,
      sortOrder: getSortOrder('ownerEmployeeId'),
      render: (_: any, record: Lead) => {
        const ownerName = getOwnerName(record);
        const pictureThumbnail = record.ownerEmployee?.pictureThumbnail;
        
        const initialsValue = !pictureThumbnail
          ? (ownerName !== '-' ? ownerName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U')
          : undefined;

        const avatarSrcValue = pictureThumbnail
          ? `data:image/gif;base64,${pictureThumbnail}`
          : undefined;

        const avatarContentTypeValue = pictureThumbnail ? 'image' : 'initials';
        
        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar
              src={avatarSrcValue}
              initials={initialsValue}
              // @ts-ignore - Type issue in gravity-ui-catalog
              contentType={avatarContentTypeValue}
              alt={ownerName}
              // @ts-ignore - Type issue in gravity-ui-catalog
              size="sm"
              // @ts-ignore - Type issue in gravity-ui-catalog
              shape="circle"
              // @ts-ignore - Type issue in gravity-ui-catalog
              appearance="gradient"
            />
            <div className="gba:flex gba:flex-col">
              <span className="gba:font-medium gba:text-sm">{ownerName}</span>
            </div>
          </div>
        );
      },
      width: '20%',
    },
    {
      title: t('lead.status', 'Status'),
      dataIndex: 'leadStatusRef',
      key: 'leadStatusRef',
      sorter: true,
      sortOrder: getSortOrder('leadStatusRef'),
      render: (_: any, record: Lead) => {
        const status = record.leadStatus?.value || '-';
        
        return (
          <Badge className={getStatusBadgeClass(status)}>
            {status}
          </Badge>
        );
      },
      width: '12%',
    },
    {
      title: t('lead.rating', 'Rating'),
      dataIndex: 'leadRatingRef',
      key: 'leadRatingRef',
      sorter: true,
      sortOrder: getSortOrder('leadRatingRef'),
      render: (_: any, record: Lead) => {
        const rating = record.leadRating?.value || '-';
        
        return (
          <Badge className={getRatingBadgeClass(rating)}>
            {rating}
          </Badge>
        );
      },
      width: '13%',
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: Lead) => (
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/platform/crm/lead-record?leadId=${record.id}`, '_blank');
            }}
            data-testid={`${DATA_TEST_ID_PREFIX}-view-lead-button-${record.id}`}
          >
            View
          </Button>
          <AppActionButton
            data-testid={`${DATA_TEST_ID_PREFIX}-update-lead-button-${record.id}`}
            variant="primary"
            contextsArray={[FlowContextName.leadEntity]}
            externalContextData={{
              leadId: record.id,
              ...(sourceApp && { sourceApp })
            }}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-lead`}
            accessToken={accessToken}
            emptyStateBehavior="enabled"
            deferMainContextRequestsUntilClick
          />
        </div>
      ),
      width: '10%',
    },
  ];

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
          variant="primary"
          onClick={retry}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <DataTable
        columns={columns}
        dataSource={leads}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} leads`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        sorter={
          // Only set sorter if it's not the default createdAt DESC sorting
          sortField === 'createdAt' && sortOrder === 'DESC' 
            ? undefined 
            : {
                field: sortField,
                order: sortOrder === 'ASC' ? 'ascend' : 'descend'
              }
        }
        onChange={handleTableChange}
        onSorterChange={handleSorterChange}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleRowClick(record as Lead),
          className: selectedLeadId === (record as Lead).id ? 'gba:bg-blue-50' : '',
          style: { cursor: 'pointer' }
        })}
        scroll={{ x: 1200 }}
        size="middle"
        data-testid={`${DATA_TEST_ID_PREFIX}-table`}
      />
    </div>
  );
}; 