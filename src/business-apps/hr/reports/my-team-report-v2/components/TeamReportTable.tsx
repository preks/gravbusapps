"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Button } from '@newwork/gravity-ui-catalog';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import { Employee } from '../hooks/useGetEmployeesReport';
import EmployeeAvatar from '@/business-apps/hr/components/employeeAvatar/EmployeeAvatar';
import { formatDataTestId } from '@/modules/orgchart/utils';

// Initialize the required plugins
dayjs.extend(weekday);
dayjs.extend(localeData);

interface TeamReportTableProps {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  loadPage: (page: number, pageSize?: number) => void;
  retry: () => void;
  total: number;
  onSelectEmployee?: (employee: Employee) => void;
  selectedEmployeeId?: string;
}

const DATA_TEST_ID_PREFIX = 'TeamReportTable';

export const TeamReportTable: React.FC<TeamReportTableProps> = ({
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
      title: t('employee.job_position', 'Job Position'),
      dataIndex: 'jobPosition',
      key: 'jobPosition',
    },
    {
      title: t('employee.location', 'Location'),
      dataIndex: 'location',
      key: 'location',
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
      title: t('employee.start_date', 'Start Date'),
      dataIndex: 'startDate',
      key: 'startDate',
      render: (startDate: string) => startDate ? dayjs(startDate).format('YYYY-MM-DD') : '-',
    },
    {
      title: t('employee.tenure', 'Tenure'),
      dataIndex: 'tenure',
      key: 'tenure',
    },
  ];

  // Handle pagination change
  const handleTableChange = (pagination: any) => {
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
        <Button variant="primary" onClick={retry} data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'RetryButton')}>
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
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} team members`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Table')}
      />
    </div>
  );
};
