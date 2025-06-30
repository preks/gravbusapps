"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Button } from '@newwork/gravity-ui-catalog';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import { Employee } from '../hooks/useGetEmployeesReport';
import { SortConfig } from '../utils/sortUtils';
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
  sortConfig: SortConfig | null;
  onSort: (key: keyof Employee) => void;
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
  selectedEmployeeId,
  sortConfig,
  onSort,
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
      dataIndex: 'firstName',
      key: 'firstName',
      sorter: true,
      sortOrder: sortConfig?.key === 'firstName' ? sortConfig.direction : undefined,
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
            {/* <EmployeeAvatar
              firstName={record.firstName}
              lastName={record.lastName}
              employeeId={record.id}
              size={32}
              randomizeStatus={true}
            /> */}
            <span>{record.firstName} {record.lastName}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('employee.job_position', 'Job Position'),
      dataIndex: 'jobPosition',
      key: 'jobPosition',
      sorter: true,
      sortOrder: sortConfig?.key === 'jobPosition' ? sortConfig.direction : undefined,
    },
    {
      title: t('employee.location', 'Location'),
      dataIndex: 'location',
      key: 'location',
      sorter: true,
      sortOrder: sortConfig?.key === 'location' ? sortConfig.direction : undefined,
    },
    {
      title: t('employee.employment_type', 'Employment Type'),
      dataIndex: 'employmentType',
      key: 'employmentType',
      sorter: true,
      sortOrder: sortConfig?.key === 'employmentType' ? sortConfig.direction : undefined,
    },
    {
      title: t('employee.contract_type', 'Contract Type'),
      dataIndex: 'contractType',
      key: 'contractType',
      sorter: true,
      sortOrder: sortConfig?.key === 'contractType' ? sortConfig.direction : undefined,
    },
    {
      title: t('employee.start_date', 'Start Date'),
      dataIndex: 'startDate',
      key: 'startDate',
      sorter: true,
      sortOrder: sortConfig?.key === 'startDate' ? sortConfig.direction : undefined,
      render: (startDate: string) => startDate ? dayjs(startDate).format('YYYY-MM-DD') : '-',
    },
    {
      title: t('employee.tenure', 'Tenure'),
      dataIndex: 'startDate', // Use startDate for calculation
      key: 'tenure', // Keep key as tenure for sorting purposes
      sorter: true,
      sortOrder: sortConfig?.key === 'tenure' ? sortConfig.direction : undefined,
      render: (startDate: string, record: Employee) => {
        if (!startDate) return '-';

        // Use exitDate if it exists, otherwise use today's date.
        const endDate = record.exitDate ? dayjs(record.exitDate) : dayjs();
        const start = dayjs(startDate);

        const totalMonths = endDate.diff(start, 'month');
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        const yearString = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
        const monthString = months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';

        if (yearString && monthString) {
          return `${yearString} and ${monthString}`;
        }
        
        return yearString || monthString || '0 months';
      },
    },
  ];

  // Handle pagination and sorting changes
  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    // Handle pagination
    const targetPage = pagination.current ?? 1;
    const targetPageSize = pagination.pageSize ?? 20;
    setCurrentPage(targetPage);
    setPageSize(targetPageSize);
    loadPage(targetPage, targetPageSize);

    // Handle sorting
    if (sorter && sorter.columnKey) {
      onSort(sorter.columnKey as keyof Employee);
    }
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
