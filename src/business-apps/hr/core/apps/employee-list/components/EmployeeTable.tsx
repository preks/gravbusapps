"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Button, Avatar } from '@newwork/gravity-ui-catalog';
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees';
import { formatDataTestId } from '@/modules/orgchart/utils';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  loadPage: (page: number, pageSize?: number) => void;
  retry: () => void;
  total: number;
  onSelectEmployee?: (employee: Employee) => void;
  selectedEmployeeId?: string;
}

const DATA_TEST_ID_PREFIX = 'EmployeeTable';

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  loading,
  error,
  loadPage,
  retry,
  total,
  onSelectEmployee,
  selectedEmployeeId
}) => {
  const { t } = useTranslation();

  // State to track current pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Handle view profile action
  const handleViewProfile = useCallback((employeeId: string) => {
    window.location.href = `/platform/landing_screen/srn_employeeProfile?id=${employeeId}`;
  }, []);

  // Handle row click to select employee
  const handleRowClick = useCallback((employee: Employee) => {
    if (onSelectEmployee) {
      onSelectEmployee(employee);
    }
  }, [onSelectEmployee]);

  // Define columns for the table
  const columns = [
    {
      title: t('employee.name', 'Name'),
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Employee) => {
        const initialsValue = record.profilePicture
          ? undefined
          : `${record.firstName?.[0] || ''}${record.lastName?.[0] || ''}`.toUpperCase();

        const avatarSrcValue = record.profilePicture
          ? `data:image/gif;base64,${record.profilePicture}`
          : undefined;

        const avatarContentTypeValue = record.profilePicture ? 'image' : 'initials';

        return (
          <div 
            className="gba:flex gba:items-center"
            onClick={() => handleRowClick(record)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRowClick(record);
              }
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            aria-pressed={selectedEmployeeId === record.id}
          >
            <div className="gba:flex gba:items-center gba:gap-3">
              <Avatar
                src={avatarSrcValue}
                initials={initialsValue}
                // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                contentType={avatarContentTypeValue}
                alt={`${record.firstName} ${record.lastName}`}
                // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
                size="sm"
                // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
                shape="rounded"
                // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
                appearance="gradient"
              />
              <span>{record.firstName} {record.lastName}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: t('employee.job_title', 'Job Title'),
      dataIndex: 'jobTitle',
      key: 'jobTitle',
    },
    {
      title: t('employee.organizational_unit', 'Organizational Unit'),
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
    },
    {
      title: t('employee.employment_type', 'Employment Type'),
      dataIndex: 'employmentType',
      key: 'employmentType',
    },
    {
      title: t('employee.contract_type', 'Contract Type'),
      dataIndex: 'contractType',
      key: 'contractType',
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewProfile(record.id)}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `ViewProfile-${record.id}`)}
        >
          {t('common.view_profile', 'View Profile')}
        </Button>
      ),
    },
  ];

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

  // Show error message if there's an error
  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8">
        <div className="gba:text-red-500 gba:mb-4">{t('common.error_occurred', 'An error occurred')}</div>
        <Button variant="primary" onClick={retry}>
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Container')}>
      <DataTable
        dataSource={employees}
        columns={columns as any}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Table')}
      />
      
      {/* Removed Load More button as pagination handles this */}
    </div>
  );
};
