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
  Badge
} from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useCampaignEntities } from '../hooks';
import { CampaignEntitiesTableProps, CampaignEntity } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const CampaignEntitiesTable: React.FC<CampaignEntitiesTableProps> = (props) => {
  const { campaignId, accessToken } = props;
  
  const {
    entities,
    totalCount,
    isLoading,
    error,
    search,
    setSearch,
    refetch
  } = useCampaignEntities(props, campaignId);

  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Helper function to get entity type badge
  const getEntityTypeBadge = (type: string) => {
    const typeConfig = {
      lead: { label: 'Lead', variant: 'secondary' as const },
      account: { label: 'Account', variant: 'default' as const },
      contact: { label: 'Contact', variant: 'outline' as const },
      opportunity: { label: 'Opportunity', variant: 'destructive' as const }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Helper function to get entity display name
  const getEntityDisplayName = (entity: CampaignEntity): string => {
    if (entity.type === 'lead' || entity.type === 'contact') {
      return entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || '-';
    }
    return entity.name || '-';
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

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid="campaign-entities-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert data-testid="campaign-entities-error">
        <AlertDescription>
          {error}
          <Button 
            variant="link" 
            onClick={refetch} 
            className="gba:ml-2"
          >
            {getTranslationFromI18nKeyAndLabel('campaign.entities.retry', 'Retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div data-testid="campaign-entities-table-container">
      {/* Search Bar */}
      <div className="gba:mb-4">
        <DebouncedInput
          value={search}
          onChange={setSearch}
          placeholder={getTranslationFromI18nKeyAndLabel('campaign.entities.search.placeholder', 'Search entities...')}
          debounceMs={300}
          data-testid="campaign-entities-search-input"
        />
      </div>

      {/* Results Count */}
      <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
        <div className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {getTranslationFromI18nKeyAndLabel('campaign.entities.count', `${entities.length} entities found`)}
        </div>
      </div>

      {/* Table */}
      <div className="gba:overflow-x-auto">
        <Table data-testid="campaign-entities-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px] gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.actions', 'Actions')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.name', 'Name')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.type', 'Type')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.creationDate', 'Creation Date')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.owner', 'Owner')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.entities.table.status', 'Status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((entity) => (
              <TableRow key={`${entity.type}-${entity.id}`} data-testid={`campaign-entity-row-${entity.type}-${entity.id}`}>
                {/* Actions */}
                <TableCell className="gba:py-4 gba:px-6">
                  <div className="gba:flex gba:justify-start gba:gap-2">
                    <AppActionButton
                      data-testid={`campaign-entities-update-${entity.type}-button-${entity.id}`}
                      variant="secondary"
                      contextsArray={getFlowContext(entity.type)}
                      externalContextData={getExternalContextData(entity)}
                      prefixDataTestId={`campaign-entities-update-${entity.type}`}
                      accessToken={accessToken}
                      emptyStateBehavior="disable"
                      deferMainContextRequestsUntilClick
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell className="gba:py-4 gba:px-6">
                  <div>
                    <div className="gba:font-medium">{getEntityDisplayName(entity)}</div>
                    {entity.email && (
                      <div className="gba:text-sm gba:truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {entity.email}
                      </div>
                    )}
                    {entity.companyName && (
                      <div className="gba:text-sm gba:truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {entity.companyName}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell className="gba:py-4 gba:px-6">
                  {getEntityTypeBadge(entity.type)}
                </TableCell>

                {/* Creation Date */}
                <TableCell className="gba:py-4 gba:px-6">
                  {formatDate(entity.creationDate)}
                </TableCell>

                {/* Owner */}
                <TableCell className="gba:py-4 gba:px-6">
                  <div>
                    <div className="gba:font-medium">
                      {entity.owner?.displayName || `${entity.owner?.firstName || ''} ${entity.owner?.lastName || ''}`.trim() || '-'}
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="gba:py-4 gba:px-6">
                  {entity.status ? (
                    <Badge variant="outline">
                      {entity.status.value}
                    </Badge>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {entities.length === 0 && !isLoading && (
        <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }} data-testid="campaign-entities-empty">
          {search ? 
            getTranslationFromI18nKeyAndLabel('campaign.entities.noResults', 'No entities found matching your search') :
            getTranslationFromI18nKeyAndLabel('campaign.entities.noData', 'No entities found for this campaign')
          }
        </div>
      )}
    </div>
  );
};

export default CampaignEntitiesTable;
