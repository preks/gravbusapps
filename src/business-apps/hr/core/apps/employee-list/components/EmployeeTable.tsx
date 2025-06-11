"use client";

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Button } from '@newwork/gravity-ui-catalog';
import { Employee } from '@/business-apps/hr/hooks/useGetEmployees';
import EmployeeAvatar from '@/business-apps/hr/components/employeeAvatar/EmployeeAvatar';
import { formatDataTestId } from '@/modules/orgchart/utils';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
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
  hasMore,
  loadMore,
  retry,
  total,
  onSelectEmployee,
  selectedEmployeeId
}) => {
  const { t } = useTranslation();

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
      render: (_: any, record: Employee) => (
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
            <EmployeeAvatar
              profilePicture={record.profilePicture}
              firstName={record.firstName}
              lastName={record.lastName}
              employeeId={record.id}
              size={32}
              randomizeStatus={true}
            />
            <span>{record.firstName} {record.lastName}</span>
          </div>
        </div>
      ),
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
    // Calculate the offset based on the current page and page size
    const offset = (pagination.current - 1) * pagination.pageSize;
    
    // Load the data for the selected page
    if (offset >= employees.length && hasMore && !loading) {
      loadMore();
    }
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
        columns={columns}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          total: total,
          showSizeChanger: false,
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Table')}
      />
      
      {/* Removed Load More button as pagination handles this */}
    </div>
  );
};
