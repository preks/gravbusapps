"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button, Tooltip } from '@newwork/gravity-ui-catalog';
import { PiHandshake, PiFile } from 'react-icons/pi';
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
  total
}) => {
  const { t } = useTranslation();

  // State to track current pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Handle view job position details
  const handleViewJobPosition = useCallback((jobPositionId: string) => {
    window.location.href = `/platform/job-position-list/${jobPositionId}`;
  }, []);
  
  // Handle edit job position
  const handleEditJobPosition = useCallback((jobPositionId: string) => {
    window.location.href = `/platform/job-position-list/${jobPositionId}/edit`;
  }, []);

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
      width: '20%',
    },
    {
      title: t('job_position.profile', 'Profile'),
      dataIndex: 'jobProfile',
      key: 'jobProfile',
      render: (_: any, record: JobPosition) => record.jobProfile?.name || '-',
      width: '12%',
    },
    {
      title: t('job_position.job_function', 'Job Function'),
      dataIndex: 'jobFunction',
      key: 'jobFunction',
      render: (_: any, record: JobPosition) => record.jobFunction?.name || '-',
      width: '12%',
    },
    {
      title: t('job_position.job_level', 'Job Level'),
      dataIndex: 'jobLevel',
      key: 'jobLevel',
      render: (_: any, record: JobPosition) => record.jobLevel?.name || '-',
      width: '10%',
    },
    {
      title: t('job_position.employment', 'Employment'),
      dataIndex: 'employment',
      key: 'employment',
      render: (_: any, record: JobPosition) => {
        const employmentType = getEmploymentTypeDisplay(record);
        const contractType = getContractTypeDisplay(record);
        
        return (
          <div className="gba:flex gba:flex-col gba:gap-1">
            {/* Employment Type with icon */}
            <div className="gba:flex gba:items-center gba:gap-1">
              <Tooltip title={t('job_position.employment_type', 'Employment Type')}>
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                  <PiHandshake size={12} className="gba:text-gray-500" />
                  <span>{employmentType}</span>
                </div>
              </Tooltip>
            </div>
            {/* Contract Type with icon */}
            <div className="gba:flex gba:items-center gba:gap-1">
              <Tooltip title={t('job_position.contract_type', 'Contract Type')}>
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                  <PiFile size={12} className="gba:text-gray-500" />
                  <span>{contractType}</span>
                </div>
              </Tooltip>
            </div>
          </div>
        );
      },
      width: '15%',
    },
    {
      title: t('job_position.organizational_unit', 'Department'),
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
      render: (_: any, record: JobPosition) => getOrganizationalUnitDisplay(record),
      width: '12%',
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
        
        return (
          <div className="gba:flex gba:items-center">
            {employee.pictureThumbnail && (
              <Avatar
                src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                alt={`${firstName} ${lastName}`}
                className="gba:mr-2"
              />
            )}
            <span>{firstName} {lastName}</span>
          </div>
        );
      },
      width: '19%',
    },
    {
      title: t('job_position.actions', 'Actions'),
      key: 'actions',
      render: (_: any, record: JobPosition) => (
        <div className="gba:flex gba:justify-end gba:space-x-2">
          <Button
            variant="text"
            size="small"
            onClick={() => handleViewJobPosition(record.id)}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'view-button')}
          >
            {t('job_position.view', 'View')}
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => handleEditJobPosition(record.id)}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'edit-button')}
          >
            {t('job_position.edit', 'Edit')}
          </Button>
        </div>
      ),
      width: '8%',
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
        scroll={{ x: true }}
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'table')}
      />
    </div>
  );
}
