"use client";

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Avatar, Button } from '@newwork/gravity-ui-catalog';
import { JobPosition } from '../hooks/useJobPositionListData';
import { formatDataTestId } from '@/modules/orgchart/utils';

interface JobPositionTableProps {
  jobPositions: JobPosition[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
  total: number;
}

const DATA_TEST_ID_PREFIX = 'JobPositionTable';

/**
 * Table component for displaying job positions with vacancy status
 */
export const JobPositionTable: React.FC<JobPositionTableProps> = ({
  jobPositions,
  loading,
  error,
  hasMore,
  loadMore,
  retry,
  total
}) => {
  const { t } = useTranslation();
  
  // Handle view job position details
  const handleViewJobPosition = useCallback((jobPositionId: string) => {
    window.location.href = `/platform/job-position-list/${jobPositionId}`;
  }, []);
  
  // Handle edit job position
  const handleEditJobPosition = useCallback((jobPositionId: string) => {
    window.location.href = `/platform/job-position-list/${jobPositionId}/edit`;
  }, []);
  
  // Define columns for the table
  const columns = [
    {
      title: t('job_position.name', 'Position Name'),
      key: 'name',
      render: (position: JobPosition) => position.name,
      width: '25%',
    },
    {
      title: t('job_position.organizational_unit', 'Organizational Unit'),
      key: 'organizationalUnit',
      render: (position: JobPosition) => position.organizationalUnit,
      width: '20%',
    },
    {
      title: t('job_position.job_profile', 'Job Profile'),
      key: 'jobProfile',
      render: (position: JobPosition) => position.jobProfile,
      width: '15%',
    },
    {
      title: t('job_position.status', 'Status'),
      key: 'status',
      render: (position: JobPosition) => (
        <div className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:inline-flex gba:items-center ${position.isVacant          ? 'gba:bg-yellow-100 gba:text-yellow-800' : 'gba:bg-green-100 gba:text-green-800'}`}>
          {position.isVacant 
            ? t('job_position.vacant', 'Vacant') 
            : t('job_position.filled', 'Filled')}
        </div>
      ),
      width: '10%',
    },
    {
      title: t('job_position.employee', 'Employee'),
      key: 'employee',
      render: (position: JobPosition) => {
        if (position.isVacant) {
          return <span className="gba:text-gray-400">{t('job_position.no_employee', 'No Employee')}</span>;
        }
        
        return (
          <div className="gba:flex gba:items-center">
            {position.employeeProfilePicture && (
              <Avatar
                src={position.employeeProfilePicture}
                alt={`${position.employeeFirstName} ${position.employeeLastName}`}
                size="xs"
                className="gba:mr-2"
              />
            )}
            <span>{position.employeeFirstName} {position.employeeLastName}</span>
          </div>
        );
      },
      width: '20%',
    },
    {
      title: t('job_position.actions', 'Actions'),
      key: 'actions',
      render: (position: JobPosition) => (
        <div className="gba:flex gba:justify-end gba:space-x-2">
          <Button
            variant="text"
            size="small"
            onClick={() => handleViewJobPosition(position.id)}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'view-button')}
          >
            {t('job_position.view', 'View')}
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => handleEditJobPosition(position.id)}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'edit-button')}
          >
            {t('job_position.edit', 'Edit')}
          </Button>
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
          variant="outlined" 
          onClick={retry}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'retry-button')}
        >
          {t('job_position.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  // Render the DataTable with the job positions
  return (
    <DataTable
      data={jobPositions}
      columns={columns}
      loading={loading}
      emptyStateMessage={t('job_position.empty_state', 'No job positions found')}
      loadingStateMessage={t('job_position.loading', 'Loading job positions...')}
      onRowClick={(position: JobPosition) => handleViewJobPosition(position.id)}
      onScroll={hasMore && !loading ? loadMore : undefined}
      data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'table')}
    />
  );
}
