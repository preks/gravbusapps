"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button, Tooltip } from '@newwork/gravity-ui-catalog';
import { PiHandshake, PiFile } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { JobPosition } from '../hooks/useJobPositionListData';
import { formatDataTestId } from '@/modules/orgchart/utils';

interface JobPositionTableProps {
  jobPositions: JobPosition[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => void;
  retry: () => void;
  total: number;
  onSelectJobPosition?: (jobPosition: JobPosition) => void;
  selectedJobPositionId?: string;
  accessToken: string;
}

const DATA_TEST_ID_PREFIX = 'JobPositionTable';

/**
 * Table component for displaying job positions with vacancy status and pagination
 */
export const JobPositionTable: React.FC<JobPositionTableProps> = ({
  jobPositions,
  loading,
  error,
  hasMore,
  loadMore,
  loadPage,
  retry,
  total,
  onSelectJobPosition,
  selectedJobPositionId,
  accessToken
}) => {
  const { t } = useTranslation();

  // State to track current pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Get contract type display value with locale support
  const getContractTypeDisplay = (jobPosition: JobPosition) => {
    if (!jobPosition.contractType) return '-';
    
    // Try to find a translation for the current locale first
    const currentLocale = navigator.language.split('-')[0]; // Get language part (e.g., 'en' from 'en-US')
    const translation = jobPosition.contractType.translations.find(
      t => t.localeCode === currentLocale
    );
    
    return translation?.value || jobPosition.contractType.value || '-';
  };

  // Get employment type display value with locale support
  const getEmploymentTypeDisplay = (jobPosition: JobPosition) => {
    if (!jobPosition.employmentType) return '-';
    
    // Try to find a translation for the current locale first
    const currentLocale = navigator.language.split('-')[0]; // Get language part (e.g., 'en' from 'en-US')
    const translation = jobPosition.employmentType.translations.find(
      t => t.localeCode === currentLocale
    );
    
    return translation?.value || jobPosition.employmentType.value || '-';
  };

  // Get organizational unit display value
  const getOrganizationalUnitDisplay = (jobPosition: JobPosition) => {
    if (!jobPosition.organizationalUnitEmployees.length) return '-';
    
    return jobPosition.organizationalUnitEmployees
      .map(ou => ou.organizationalUnit.name)
      .join(', ');
  };

  // Handle pagination change
  const handleTableChange = (pagination: any) => {
    console.log('Pagination changed:', { 
      current: pagination.current, 
      pageSize: pagination.pageSize,
      total: pagination.total 
    });
    
    // When page size changes, we should go to page 1
    // When page changes, we use the current page
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    
    // Update state
    setCurrentPage(targetPage);
    setPageSize(targetPageSize);
    
    // Load the data for the selected page with the new page size
    loadPage(targetPage, targetPageSize);
  };
  
  // Define columns for the table
  const columns = [
    {
      title: t('job_position.name', 'Name'),
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: JobPosition) => record.name,
      width: '25%',
    },
    {
      title: t('job_position.profile', 'Profile'),
      dataIndex: 'jobProfile',
      key: 'jobProfile',
      render: (_: any, record: JobPosition) => record.jobProfile?.name || '-',
      width: '20%',
    },
    {
      title: t('job_position.organizational_unit', 'Department'),
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
      render: (_: any, record: JobPosition) => getOrganizationalUnitDisplay(record),
      width: '20%',
    },
    {
      title: t('job_position.employee', 'Employee'),
      dataIndex: 'employeeStatus',
      key: 'employeeStatus',
      render: (_: any, record: JobPosition) => {
        const isVacant = record.employeePositions.length === 0;
        
        if (isVacant) {
          // Show vacant pill when no employee is assigned
          return (
            <div className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:inline-flex gba:items-center gba:bg-yellow-100 gba:text-yellow-800`}>
              {t('job_position.vacant', 'Vacant')}
            </div>
          );
        }
        
        // Show employee information when someone is assigned
        const employeePosition = record.employeePositions[0];
        const { firstName, lastName, employee } = employeePosition;
        
        // Generate initials and avatar props like in employee-directory
        const initialsValue = employee.pictureThumbnail
          ? undefined
          : `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

        const avatarSrcValue = employee.pictureThumbnail
          ? `data:image/gif;base64,${employee.pictureThumbnail}`
          : undefined;

        const avatarContentTypeValue = employee.pictureThumbnail ? 'image' : 'initials';
        
        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar
              src={avatarSrcValue}
              initials={initialsValue}
              // @ts-ignore - Type issue in gravity-ui-catalog for contentType
              contentType={avatarContentTypeValue}
              alt={`${firstName} ${lastName}`}
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              size="sm"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              shape="rounded"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              appearance="gradient"
            />
            <span>{firstName} {lastName}</span>
          </div>
        );
      },
      width: '25%',
    },
    {
      title: '', // Remove the "Actions" label
      key: 'actions',
      render: (_: any, record: JobPosition) => (
        <div className="gba:flex gba:justify-end">
          <AppActionButton
            data-testid="update-job-position-button"
            variant="primary"
            contextsArray={[FlowContextName.jobPositionEntity]}
            externalContextData={{
              jobPositionId: record.id
            }}
            prefixDataTestId="update-job-position"
            accessToken={accessToken}
          />
        </div>
      ),
      width: '10%',
    },
  ];
  
  // If there's an error, show a message with retry button
  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8">
        <p className="gba:text-red-500 gba:mb-4">{t('job_position.error', 'Error loading job positions')}</p>
        <Button 
          variant="outline" 
          onClick={retry}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'retry-button')}
        >
          {t('job_position.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  // Handle row click for selection
  const handleRowClick = useCallback((record: JobPosition) => {
    if (onSelectJobPosition) {
      onSelectJobPosition(record);
    }
  }, [onSelectJobPosition]);

  // Render the DataTable with proper pagination
  return (
    <div data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Container')}>
      <DataTable
        dataSource={jobPositions}
        columns={columns as any}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} job positions`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        onRow={(record: any) => ({
          onClick: () => handleRowClick(record as JobPosition),
          className: selectedJobPositionId === record.id ? 'gba:bg-blue-50' : '',
          style: { cursor: 'pointer' }
        })}
        scroll={{ x: true }}
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'table')}
      />
    </div>
  );
}
