import React, { useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Spinner, Button, Card, CardContent } from '@newwork/nw-design-system';
import { PiUser, PiCurrencyDollar, PiTarget, PiFunnel, PiCalendar, PiBuilding, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Opportunity } from '../types';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { getWinningChanceBadgeVariant, getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils';

export interface OpportunityTableProps {
  data: Opportunity[];
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
  sortOrder: 'ASC' | 'DESC' | '';
  onSelectOpportunity?: (opportunity: Opportunity) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void;
  selectedOpportunityId?: string;
  accessToken: string;
  sourceApp?: string;
}

const DATA_TEST_ID_PREFIX = 'OpportunityTable';

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  data,
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
  onSelectOpportunity,
  onPaginationChange,
  onSortingChange,
  selectedOpportunityId,
  accessToken,
  sourceApp
}) => {
  const formatCurrency = (amount: number | undefined, currency?: string): string => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };



  const getWinRateColor = (winningChance?: number): string => {
    if (!winningChance) return 'gray';
    if (winningChance >= 75) return 'green';
    if (winningChance >= 50) return 'orange';
    if (winningChance >= 25) return 'yellow';
    return 'red';
  };

  // Handle row click
  const handleRowClick = useCallback((record: Opportunity) => {
    // Determine source based on sourceApp
    const source = (sourceApp === 'investment-relations' || sourceApp === 'IRM') ? 'investments' : 'customer-relations';
    
    // Navigate to opportunity record page
    const url = buildPlatformUrl('/platform/crm/opportunity-record', { 
      opportunityId: record.id, 
      source: source 
    });
    navigateTo(url);
    
    // Also call the selection callback if provided
    onSelectOpportunity?.(record);
  }, [onSelectOpportunity, sourceApp]);

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === 'ASC') {
        onSortingChange(field, 'DESC');
      } else if (sortOrder === 'DESC') {
        onSortingChange('', '');
      } else {
        onSortingChange(field, 'ASC');
      }
    } else {
      onSortingChange(field, 'ASC');
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  const getOwnerName = (record: Opportunity) => {
    if (record.ownerEmployee?.displayName) {
      return record.ownerEmployee.displayName;
    }
    if (record.ownerEmployee?.firstName && record.ownerEmployee?.lastName) {
      return `${record.ownerEmployee.firstName} ${record.ownerEmployee.lastName}`;
    }
    return 'Unassigned';
  };

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {loading && (
          <div className="gba:flex gba:justify-center gba:p-4">
            <Spinner />
          </div>
        )}
        
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}>ACTIONS</TableHead>
                <TableHead 
                  className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('name')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Opportunity
                    {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('estimatedAmount')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-value-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Value
                    {renderSortIcon('estimatedAmount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('winningChance')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Win Rate
                    {renderSortIcon('winningChance')}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('stage')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-stage-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Stage
                    {renderSortIcon('stage')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-header`}>
                  Pipeline
                </TableHead>
                <TableHead 
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort('closeDate')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-close-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Close Date
                    {renderSortIcon('closeDate')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}>
                  Owner
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow 
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${selectedOpportunityId === record.id ? 'gba:bg-blue-50' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-opportunity-button-${record.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.opportunityEntity]}
                        externalContextData={{
                          opportunityId: record.id
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-opportunity`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-cell-${record.id}`}>
                    <div 
                      className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-name-${record.id}`}
                    >
            <div className="gba:font-medium gba:text-sm gba:truncate" title={record.name}>
              {record.name}
            </div>
            {record.account && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500">
                <PiBuilding size={12} />
                <span className="gba:truncate" title={record.account.name}>
                  {record.account.name}
                </span>
              </div>
            )}
          </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-value-cell-${record.id}`}>
        <div className="gba:text-sm gba:font-medium">
          {formatCurrency(record.estimatedAmount, record.currency?.code)}
        </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-cell-${record.id}`}>
                    <Badge variant={getWinningChanceBadgeVariant(record.winningChance)}>
            {record.winningChance ? `${record.winningChance}%` : '0%'}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-stage-cell-${record.id}`}>
                    <Badge variant={getSalesPipelineStageBadgeVariant(record.salesPipelineStage)}>
                      {record.salesPipelineStage?.value || 'Unknown Stage'}
                    </Badge>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-cell-${record.id}`}>
        <div className="gba:text-sm gba:truncate" title={record.salesPipeline?.value}>
          {record.salesPipeline?.value || '-'}
        </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-close-date-cell-${record.id}`}>
        <div className="gba:text-sm">
          {formatDate(record.closeDate)}
        </div>
                  </TableCell>
                  <TableCell className="gba:py-4 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar size="sm">
                        {record.ownerEmployee?.pictureThumbnail && (
                          <AvatarImage 
                            src={`data:image/gif;base64,${record.ownerEmployee.pictureThumbnail}`} 
                            alt={getOwnerName(record)} 
                          />
                        )}
                        <AvatarFallback>
                          {getOwnerName(record) !== '-' 
                            ? getOwnerName(record).split(' ').map(n => n[0]).join('').toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-sm">{getOwnerName(record)}</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
        <div className="gba:text-sm gba:text-muted-foreground">
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} opportunities`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
            Page {currentPage} of {Math.ceil(total / pageSize)}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to previous page</span>
              ⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to next page</span>
              ⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to last page</span>
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OpportunityTable; 