"use client";

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Button, 
  Avatar, 
  AvatarFallback, 
  AvatarImage,
  Badge,
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system';
import { PiHandshake, PiFile, PiCaretLeft, PiCaretRight, PiCaretDoubleLeft, PiCaretDoubleRight } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { JobPosition } from '../hooks/useJobPositionListData';
import { formatDataTestId } from '@/modules/orgchart/utils';

// Memoized AppActionButton to prevent unnecessary re-renders and API calls
const MemoizedAppActionButton = React.memo<{
  jobPositionId: string;
  employeeId?: string;
  userId?: string;
  accessToken: string;
  dataTestIdPrefix: string;
}>(({ jobPositionId, employeeId, userId, accessToken, dataTestIdPrefix }) => (
  <AppActionButton
    data-testid={formatDataTestId(dataTestIdPrefix, `Actions-${jobPositionId}`)}
    variant="primary"
    size="sm"
    contextsArray={[FlowContextName.jobPositionEntity]}
    externalContextData={{
      jobPositionId: jobPositionId,
      employeeId: employeeId,
      keycloakUserId: userId
    }}
    prefixDataTestId={`${dataTestIdPrefix}-action-${jobPositionId}`}
    accessToken={accessToken}
    emptyStateBehavior="enabled"
    deferMainContextRequestsUntilClick
    autoExecuteSingleAction={true}
  />
));

MemoizedAppActionButton.displayName = 'MemoizedAppActionButton';

interface JobPositionTableProps {
  jobPositions: JobPosition[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => void;
  retry: () => void;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectJobPosition?: (jobPosition: JobPosition) => void;
  selectedJobPositionId?: string;
  accessToken: string;
}

const DATA_TEST_ID_PREFIX = 'JobPositionTable';

/**
 * Table component for displaying job positions with vacancy status and pagination
 * Updated to use nw-design-system components and design tokens
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
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectJobPosition,
  selectedJobPositionId,
  accessToken
}) => {
  const { t } = useTranslation();

  // Calculate pagination values
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  // Handle page navigation
  const handleFirstPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  }, [currentPage, onPageChange]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleLastPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    onPageSizeChange(newPageSize);
    onPageChange(1); // Reset to first page when changing page size
  }, [onPageChange, onPageSizeChange]);

  // State to track current pagination
  const [currentPageLocal, setCurrentPageLocal] = useState(1);
  const [pageSizeLocal, setPageSizeLocal] = useState(20);
  
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

  // Get job function display value
  const getJobFunctionDisplay = (jobPosition: JobPosition) => {
    return jobPosition.jobFunction?.name || '-';
  };

  // Render employee cell with vacancy status
  const renderEmployeeCell = (jobPosition: JobPosition) => {
    const isVacant = jobPosition.employeePositions.length === 0;
    
    if (isVacant) {
      // Show vacant status using design system Badge
      return (
        <div className="flex items-center justify-start">
          <Badge 
            variant="secondary" 
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'vacant-badge')}
            style={{
              backgroundColor: 'var(--nw-color-warning-secondary)',
              color: 'var(--nw-color-warning-secondary-foreground)',
              borderColor: 'var(--nw-color-warning)',
            }}
          >
            {t('job_position.vacant', 'Vacant')}
          </Badge>
        </div>
      );
    }
    
    // Show employee information when someone is assigned
    const employeePosition = jobPosition.employeePositions[0];
    const { firstName, lastName, employee } = employeePosition;

    // Generate initials and avatar props like in employee-directory
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    const avatarSrc = employee.pictureThumbnail
      ? `data:image/gif;base64,${employee.pictureThumbnail}`
      : undefined;
    
    return (
      <div 
        className="flex items-center gap-3"
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'employee-info')}
      >
        <Avatar className="h-8 w-8">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={`${firstName} ${lastName}`} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{firstName} {lastName}</span>
      </div>
    );
  };

  // If there's an error, show a message with retry button
  if (error) {
    return (
      <div className="layout-content gap-md items-center justify-center" style={{ padding: 'var(--nw-spacing-8)' }}>
        <Alert variant="destructive">
          <AlertDescription>
            {t('job_position.error', 'Error loading job positions')}
          </AlertDescription>
        </Alert>
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

  // Show loading spinner if loading
  if (loading && jobPositions.length === 0) {
    return (
      <div className="layout-content gap-md items-center justify-center" style={{ padding: 'var(--nw-spacing-8)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Render the Table with nw-design-system components
  return (
    <div data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'Container')} className="gba:w-full gba:h-full gba:flex gba:flex-col">
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
        <Table 
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'table')}
          style={{
            tableLayout: 'fixed',
            width: '100%'
          }}
        >
          <TableHeader>
            <TableRow className="gba:grid gba:grid-cols-[auto_1fr_0.8fr_0.8fr_0.6fr_1fr] gba:gap-2">
              <TableHead className="gba:px-2">
                {t('job_position.actions', 'Actions')}
              </TableHead>
              <TableHead className="gba:px-2">
                {t('job_position.name', 'Position Name')}
              </TableHead>
              <TableHead className="gba:px-2">
                {t('job_position.organizational_unit', 'Department')}
              </TableHead>
              <TableHead className="gba:px-2">
                {t('job_position.job_function', 'Job Function')}
              </TableHead>
              <TableHead className="gba:px-2">
                {t('job_position.profile', 'Profile')}
              </TableHead>
              <TableHead className="gba:px-2">
                {t('job_position.employee', 'Employee')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobPositions.map((jobPosition) => (
              <TableRow 
                key={jobPosition.id}
                onClick={() => handleRowClick(jobPosition)}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `row-${jobPosition.id}`)}
                className={`gba:grid gba:grid-cols-[auto_1fr_0.8fr_0.8fr_0.6fr_1fr] gba:gap-2 cursor-pointer hover:bg-muted/50 ${
                  selectedJobPositionId === jobPosition.id 
                    ? 'bg-accent/50' 
                    : ''
                }`}
              >
                {/* Actions Column - First */}
                <TableCell className="gba:px-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <MemoizedAppActionButton
                      jobPositionId={jobPosition.id}
                      employeeId={jobPosition.employee?.id}
                      userId={jobPosition.employee?.userId}
                      accessToken={accessToken}
                      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                    />
                  </div>
                </TableCell>

                {/* Position Name */}
                <TableCell 
                  className="gba:px-2 font-medium" 
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `name-${jobPosition.id}`)}
                >
                  {jobPosition.name}
                </TableCell>

                {/* Department */}
                <TableCell 
                  className="gba:px-2"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `department-${jobPosition.id}`)}
                >
                  {getOrganizationalUnitDisplay(jobPosition)}
                </TableCell>

                {/* Job Function */}
                <TableCell 
                  className="gba:px-2"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `job-function-${jobPosition.id}`)}
                >
                  {getJobFunctionDisplay(jobPosition)}
                </TableCell>

                {/* Profile */}
                <TableCell 
                  className="gba:px-2"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `profile-${jobPosition.id}`)}
                >
                  {jobPosition.jobProfile?.name || '-'}
                </TableCell>
                
                {/* Employee / Vacancy Status */}
                <TableCell 
                  className="gba:px-2"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `employee-${jobPosition.id}`)}
                >
                  {renderEmployeeCell(jobPosition)}
                </TableCell>
              </TableRow>
            ))}

            {jobPositions.length === 0 && !loading && (
              <TableRow>
                <TableCell 
                  colSpan={6} 
                  className="text-center text-muted-foreground"
                  style={{ padding: 'var(--nw-spacing-8)' }}
                >
                  {t('job_position.no_positions', 'No job positions found')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls - Outside scrolling area */}
      {total > 0 && (
        <div 
          className="flex items-center justify-between gap-4"
          style={{ 
            padding: 'var(--nw-spacing-4)',
            borderTop: '1px solid var(--nw-color-border)',
            backgroundColor: 'var(--nw-color-background)'
          }}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'pagination')}
        >
          {/* Count Display */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {total > 0 ? (
                `Showing ${startIndex}-${endIndex} of ${total} job positions`
              ) : (
                t('job_position.no_positions_found', 'No job positions found')
              )}
            </div>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('job_position.rows_per_page', 'Rows per page:')}
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'page-size-select')}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFirstPage}
              disabled={currentPage === 1 || loading}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'first-page-button')}
            >
              <PiCaretDoubleLeft size={16} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'previous-page-button')}
            >
              <PiCaretLeft size={16} />
            </Button>
            
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-muted-foreground">
                {t('job_position.page', 'Page')} {currentPage} {t('job_position.of', 'of')} {totalPages}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'next-page-button')}
            >
              <PiCaretRight size={16} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLastPage}
              disabled={currentPage === totalPages || loading}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'last-page-button')}
            >
              <PiCaretDoubleRight size={16} />
            </Button>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {loading && jobPositions.length > 0 && (
        <div 
          className="flex items-center justify-center"
          style={{ 
            padding: 'var(--nw-spacing-4)',
            borderTop: '1px solid var(--nw-color-border)',
            backgroundColor: 'var(--nw-color-background)'
          }}
        >
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-muted-foreground">
            {t('job_position.loading', 'Loading...')}
          </span>
        </div>
      )}
    </div>
  );
};
