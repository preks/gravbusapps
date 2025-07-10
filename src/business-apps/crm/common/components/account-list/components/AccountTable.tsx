"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button, Tag, Tooltip } from '@newwork/gravity-ui-catalog';
import { PiUser, PiEnvelope, PiPhone, PiBuilding, PiCalendar, PiMapPin } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Account } from '../types';
import dayjs from 'dayjs';

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
  sortOrder: 'ASC' | 'DESC';
  onSelectAccount?: (account: Account) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC') => void;
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
  const handleRowClick = useCallback((record: Account) => {
    onSelectAccount?.(record);
  }, [onSelectAccount]);

  // Define columns for the table
  const columns: any[] = [
    {
      title: t('account.company', 'Company'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: getSortOrder('name'),
      render: (_: any, record: Account) => {
        return (
          <div className="gba:flex gba:items-center gba:gap-3">
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
        );
      },
      width: '25%',
    },
    {
      title: t('account.contact', 'Contact Info'),
      dataIndex: 'email',
      key: 'email',
      render: (_: any, record: Account) => {
        return (
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
        );
      },
      width: '20%',
    },
    {
      title: t('account.created', 'Creation Date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      sortOrder: getSortOrder('createdAt'),
      render: (_: any, record: Account) => {
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
      title: t('account.owner', 'Owner'),
      dataIndex: 'ownerEmployeeId',
      key: 'ownerEmployeeId',
      sorter: true,
      sortOrder: getSortOrder('ownerEmployeeId'),
      render: (_: any, record: Account) => {
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
      title: t('account.type', 'Type'),
      dataIndex: 'typeRef',
      key: 'typeRef',
      sorter: true,
      sortOrder: getSortOrder('typeRef'),
      render: (_: any, record: Account) => {
        const type = record.type?.value || '-';
        
        return (
          <Tag color={getTypeColor(type)}>
            {type}
          </Tag>
        );
      },
      width: '12%',
    },
    {
      title: t('account.industry', 'Industry'),
      dataIndex: 'industryRef',
      key: 'industryRef',
      sorter: true,
      sortOrder: getSortOrder('industryRef'),
      render: (_: any, record: Account) => {
        const industry = record.industry?.value || '-';
        
        return (
          <Tag color={getIndustryColor(industry)}>
            {industry}
          </Tag>
        );
      },
      width: '13%',
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: Account) => (
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/platform/crm/account-record?accountId=${record.id}`, '_blank');
            }}
            data-testid={`${DATA_TEST_ID_PREFIX}-view-account-button-${record.id}`}
          >
            View
          </Button>
          <AppActionButton
            data-testid={`${DATA_TEST_ID_PREFIX}-update-account-button-${record.id}`}
            variant="primary"
            contextsArray={[FlowContextName.leadEntity]}
            externalContextData={{
              accountId: record.id
            }}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-account`}
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
          {t('account.error.title', 'Error Loading Accounts')}
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
        dataSource={accounts}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} accounts`,
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
          onClick: () => handleRowClick(record as Account),
          className: selectedAccountId === (record as Account).id ? 'gba:bg-blue-50' : '',
          style: { cursor: 'pointer' }
        })}
        scroll={{ x: 1200 }}
        size="middle"
        data-testid={`${DATA_TEST_ID_PREFIX}-table`}
      />
    </div>
  );
}; 