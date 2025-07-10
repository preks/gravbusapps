"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button, Tag, Tooltip } from '@newwork/gravity-ui-catalog';
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
  onSelectLead?: (lead: Lead) => void;
  selectedLeadId?: string;
  accessToken: string;
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
  onSelectLead,
  selectedLeadId,
  accessToken
}) => {
  const { t } = useTranslation();

  // State to track current pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  // Get rating color based on value
  const getRatingColor = (rating?: string) => {
    if (!rating) return 'gray';
    switch (rating.toLowerCase()) {
      case 'cold':
        return 'blue';
      case 'warm':
        return 'orange';
      case 'hot':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get lead status color
  const getStatusColor = (status?: string) => {
    if (!status) return 'gray';
    switch (status.toLowerCase()) {
      case 'new':
      case 'open':
        return 'blue';
      case 'qualified':
      case 'contacted':
        return 'green';
      case 'unqualified':
      case 'lost':
        return 'red';
      case 'converted':
        return 'purple';
      default:
        return 'gray';
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination: any) => {
    console.log('Pagination changed:', { 
      current: pagination.current, 
      pageSize: pagination.pageSize,
      total: pagination.total 
    });
    
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    
    setCurrentPage(targetPage);
    setPageSize(targetPageSize);
    
    loadPage(targetPage, targetPageSize);
  };

  // Handle row click
  const handleRowClick = useCallback((record: Lead) => {
    onSelectLead?.(record);
  }, [onSelectLead]);

  // Define columns for the table
  const columns: any[] = [
    {
      title: t('lead.contact', 'Contact'),
      dataIndex: 'contact',
      key: 'contact',
      render: (_: any, record: Lead) => {
        const contactName = getContactName(record);
        
        return (
          <span className="gba:font-medium">{contactName}</span>
        );
      },
      width: '15%',
    },
    {
      title: t('lead.company', 'Company'),
      dataIndex: 'companyName',
      key: 'companyName',
      render: (_: any, record: Lead) => {
        const companyName = record.companyName || record.account?.name || '-';
        
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiBuilding size={16} className="gba:text-gray-400" />
            <span className="gba:font-medium">{companyName}</span>
          </div>
        );
      },
      width: '15%',
    },
    {
      title: t('lead.country', 'Country'),
      dataIndex: 'country',
      key: 'country',
      render: (_: any, record: Lead) => {
        const country = record.country?.value || '-';
        
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiMapPin size={16} className="gba:text-gray-400" />
            <span>{country}</span>
          </div>
        );
      },
      width: '10%',
    },
    {
      title: t('lead.phone', 'Phone'),
      dataIndex: 'phone',
      key: 'phone',
      render: (_: any, record: Lead) => {
        const phone = getContactPhone(record);
        
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiPhone size={16} className="gba:text-gray-400" />
            <span>{phone}</span>
          </div>
        );
      },
      width: '12%',
    },
    {
      title: t('lead.email', 'E-Mail'),
      dataIndex: 'email',
      key: 'email',
      render: (_: any, record: Lead) => {
        const contactEmail = getContactEmail(record);
        const companyEmail = record.companyEmail;
        
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiEnvelope size={16} className="gba:text-gray-400" />
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm">{contactEmail}</span>
              {companyEmail && companyEmail !== contactEmail && (
                <span className="gba:text-xs gba:text-gray-500">{companyEmail}</span>
              )}
            </div>
          </div>
        );
      },
      width: '15%',
    },
    {
      title: t('lead.created', 'Creation Date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
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
      width: '12%',
    },
    {
      title: t('lead.owner', 'Owner'),
      dataIndex: 'owner',
      key: 'owner',
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
      width: '18%',
    },
    {
      title: t('lead.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: Lead) => {
        const status = record.leadStatus?.value || '-';
        
        return (
          <Tag color={getStatusColor(status)}>
            {status}
          </Tag>
        );
      },
      width: '10%',
    },
    {
      title: t('lead.rating', 'Rating'),
      dataIndex: 'rating',
      key: 'rating',
      render: (_: any, record: Lead) => {
        const rating = record.leadRating?.value || '-';
        
        return (
          <Tag color={getRatingColor(rating)}>
            {rating}
          </Tag>
        );
      },
      width: '8%',
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: Lead) => (
        <div className="gba:flex gba:justify-end">
          <AppActionButton
            data-testid={`${DATA_TEST_ID_PREFIX}-update-lead-button-${record.id}`}
            variant="primary"
            contextsArray={[FlowContextName.leadEntity]}
            externalContextData={{
              leadId: record.id
            }}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-lead`}
            accessToken={accessToken}
            emptyStateBehavior="enabled"
            deferMainContextRequestsUntilClick
          />
        </div>
      ),
      width: '5%',
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
          onChange: handleTableChange,
          onShowSizeChange: handleTableChange,
        }}
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