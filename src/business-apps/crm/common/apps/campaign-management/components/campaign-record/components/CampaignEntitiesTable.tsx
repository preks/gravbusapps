import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Badge,
  Card,
  CardContent
} from '@newwork/nw-design-system';
import {
  PiArrowUp,
  PiArrowDown,
  PiUser,
  PiBuilding,
  PiUsers,
  PiTarget
} from 'react-icons/pi';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { CampaignEntity } from '../types/CampaignRecordTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

interface CampaignEntitiesTableProps {
  entities: CampaignEntity[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: "ASC" | "DESC" | "";
  onTableChange: (pagination: any, filters: any, sorter: any) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  onRowClick?: (entity: CampaignEntity) => void;
  accessToken: string;
}

const CampaignEntitiesTable: React.FC<CampaignEntitiesTableProps> = ({
    entities,
    isLoading,
    error,
  totalCount,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onTableChange,
  onPaginationChange,
  onSortingChange,
  onRowClick,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = "CampaignEntitiesTable";

  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Helper function to get entity type badge
  const getEntityTypeBadge = (type: string) => {
    const typeConfig = {
      lead: { label: 'Lead', variant: 'default' as const, icon: <PiUser size={14} /> },
      account: { label: 'Account', variant: 'secondary' as const, icon: <PiBuilding size={14} /> },
      contact: { label: 'Contact', variant: 'outline' as const, icon: <PiUsers size={14} /> },
      opportunity: { label: 'Opportunity', variant: 'destructive' as const, icon: <PiTarget size={14} /> }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, variant: 'default' as const, icon: <PiUser size={14} /> };
    
    return (
      <Badge variant={config.variant} className="gba:inline-flex gba:items-center gba:gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Helper function to get entity display name
  const getEntityDisplayName = (entity: CampaignEntity): string => {
    if (entity.type === 'lead' || entity.type === 'contact') {
      return entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || '-';
    }
    return entity.name || '-';
  };

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === "ASC") {
        onSortingChange(field, "DESC");
      } else if (sortOrder === "DESC") {
        onSortingChange("", "");
      } else {
        onSortingChange(field, "ASC");
      }
    } else {
      onSortingChange(field, "ASC");
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field || !sortField) return null;
    if (sortOrder === "ASC")
      return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === "DESC")
      return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // Helper function to get flow context for entity type
  const getFlowContext = (entityType: string): FlowContextName[] => {
    switch (entityType) {
      case 'lead':
        return [FlowContextName.leadEntity];
      case 'account':
        return [FlowContextName.accountEntity];
      case 'contact':
        return [FlowContextName.contactEntity];
      case 'opportunity':
        return [FlowContextName.opportunityEntity];
      default:
        return [FlowContextName.flow];
    }
  };

  // Helper function to get external context data
  const getExternalContextData = (entity: CampaignEntity) => {
    switch (entity.type) {
      case 'lead':
        return { leadId: entity.id };
      case 'account':
        return { accountId: entity.id };
      case 'contact':
        return { contactId: entity.id };
      case 'opportunity':
        return { opportunityId: entity.id };
      default:
        return { entityId: entity.id };
    }
  };

  // Handle row click
  const handleRowClick = (entity: CampaignEntity) => {
    if (onRowClick) {
      onRowClick(entity);
    }
  };

  // Show error state
  if (error) {
    return (
      <Alert className="gba:m-4">
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel('campaign.entities.error.message', 'Error loading campaign entities')}: {error}
          <Button 
            variant="link" 
            size="sm"
            onClick={() => window.location.reload()}
            className="gba:ml-2"
          >
            {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
      </div>
        )}

      <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
          <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {/* Actions Column */}
                <TableHead
                  className="gba:w-[80px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  ACTIONS
              </TableHead>

                {/* Name Column - Sortable */}
                <TableHead
                  className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer hover:gba:bg-gray-100"
                  onClick={() => handleSort('name')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-name-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Name
                    {renderSortIcon('name')}
                  </div>
              </TableHead>

                {/* Type Column */}
                <TableHead
                  className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                >
                  Type
              </TableHead>

                {/* Creation Date Column - Sortable */}
                <TableHead
                  className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer hover:gba:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-creation-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Creation Date
                    {renderSortIcon('createdAt')}
                  </div>
              </TableHead>

                {/* Owner Column - Sortable */}
                <TableHead
                  className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer hover:gba:bg-gray-100"
                  onClick={() => handleSort('ownerEmployeeId')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Owner
                    {renderSortIcon('ownerEmployeeId')}
                  </div>
              </TableHead>

                {/* Status Column */}
                <TableHead
                  className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  Status
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
              {entities.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="gba:text-center gba:py-8 gba:text-gray-500">
                    {getTranslationFromI18nKeyAndLabel('campaign.entities.empty', 'No entities found for this campaign')}
                  </TableCell>
                </TableRow>
              ) : (
                entities.map((entity) => (
                  <TableRow 
                    key={entity.id}
                    className="gba:border-b hover:gba:bg-gray-50 gba:cursor-pointer"
                    onClick={() => handleRowClick(entity)}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${entity.id}`}
                  >
                {/* Actions */}
                <TableCell className="gba:py-4 gba:px-6">
                  <div className="gba:flex gba:justify-start gba:gap-2">
                    <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-${entity.type}-button-${entity.id}`}
                      variant="secondary"
                      contextsArray={getFlowContext(entity.type)}
                      externalContextData={getExternalContextData(entity)}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-${entity.type}`}
                      accessToken={accessToken}
                      emptyStateBehavior="disable"
                      deferMainContextRequestsUntilClick
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell className="gba:py-4 gba:px-6">
                      <div className="gba:font-medium gba:text-gray-900">
                        {getEntityDisplayName(entity)}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell className="gba:py-4 gba:px-6">
                  {getEntityTypeBadge(entity.type)}
                </TableCell>

                {/* Creation Date */}
                    <TableCell className="gba:py-4 gba:px-6 gba:text-gray-600">
                  {formatDate(entity.creationDate)}
                </TableCell>

                {/* Owner */}
                    <TableCell className="gba:py-4 gba:px-6 gba:text-gray-600">
                      {entity.owner?.displayName || 
                       (entity.owner?.firstName && entity.owner?.lastName 
                         ? `${entity.owner.firstName} ${entity.owner.lastName}` 
                         : '-')}
                </TableCell>

                {/* Status */}
                <TableCell className="gba:py-4 gba:px-6">
                  {entity.status ? (
                    <Badge variant="outline">
                      {entity.status.value}
                    </Badge>
                  ) : (
                        <span className="gba:text-gray-500">-</span>
                  )}
                </TableCell>
              </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </div>
      
        {/* Pagination */}
        {totalCount > 0 && (
          <div className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-t gba:border-gray-200">
            <div className="gba:text-sm gba:text-gray-600">
              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} entities
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:text-sm gba:text-gray-600">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => onPaginationChange(1, parseInt(e.target.value))}
                className="gba:border gba:border-gray-300 gba:rounded gba:px-2 gba:py-1 gba:text-sm"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              
              <div className="gba:text-sm gba:text-gray-600">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              
              <div className="gba:flex gba:gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-prev-page`}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page`}
                >
                  Next
                </Button>
              </div>
            </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
};

export default CampaignEntitiesTable;