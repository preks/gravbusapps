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
  Button
} from '@newwork/nw-design-system';
import { StatusBadge } from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { SalesCampaign } from './types/SalesCampaignTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

interface CampaignsTableProps {
  campaigns: SalesCampaign[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onTableChange: (pagination: any, filters: any, sorter: any) => void;
  onRowClick?: (campaign: SalesCampaign) => void;
  accessToken: string;
}

const CampaignsTable: React.FC<CampaignsTableProps> = ({
  campaigns,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  onTableChange,
  onRowClick,
  accessToken
}) => {
  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Helper to compute campaign status from dates
  const getCampaignStatus = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-';
    const now = dayjs();
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (now.isBefore(start, 'day')) return 'Planned';
    if (now.isAfter(end, 'day')) return 'Completed';
    return 'Active';
  };

  const mapStatusToVariant = (
    status: string
  ): 'default' | 'success' | 'error' | 'pending' => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Planned':
        return 'pending';
      case 'Completed':
        return 'default';
      default:
        return 'default';
    }
  };

  // Styling using design tokens to render filled pills
  const getStatusStyles = (status: string): React.CSSProperties => {
    switch (status) {
      case 'Active':
        return {
          backgroundColor: 'var(--color-primary-500)',
          color: 'var(--color-on-primary)',
          borderColor: 'var(--color-primary-600)',
          borderWidth: 0
        };
      case 'Planned':
        return {
          backgroundColor: 'var(--color-warning-500)',
          color: 'var(--color-on-primary)',
          borderColor: 'var(--color-warning-600)',
          borderWidth: 0
        };
      case 'Completed':
        return {
          backgroundColor: 'var(--color-success-500)',
          color: 'var(--color-on-primary)',
          borderColor: 'var(--color-success-600)',
          borderWidth: 0
        };
      default:
        return {
          backgroundColor: 'var(--color-surface-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-default)',
          borderWidth: 0
        };
    }
  };

  // Handle row click
  const handleRowClick = (campaign: SalesCampaign) => {
    if (onRowClick) {
      onRowClick(campaign);
    }
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid="campaigns-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert data-testid="campaigns-error">
        <AlertDescription>
          {error}
          <Button 
            variant="link" 
            onClick={() => onTableChange({ current: 1, pageSize: 20 }, {}, {})} 
            className="gba:ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div data-testid="campaigns-table-container">
      <div className="gba:overflow-x-auto">
        <Table data-testid="campaigns-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px] gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaigns.table.actions', 'Actions')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaigns.table.name', 'Name')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaigns.table.type', 'Campaign Type')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaigns.table.startDate', 'Start Date')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaigns.table.endDate', 'End Date')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:py-4 gba:px-6" style={{ color: 'var(--color-text-primary)' }} data-testid="campaigns-table-status-header">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.status', 'Status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow 
                key={campaign.id} 
                data-testid={`campaign-row-${campaign.id}`}
                onClick={() => handleRowClick(campaign)}
                className={onRowClick ? "gba:cursor-pointer gba:hover:bg-gray-50" : ""}
                style={onRowClick ? { 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                } : {}}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.backgroundColor = '';
                  }
                }}
              >
                <TableCell className="gba:py-4 gba:px-6">
                  <div className="gba:flex gba:justify-start gba:gap-2">
                    <AppActionButton
                      data-testid={`campaigns-update-campaign-button-${campaign.id}`}
                      variant="secondary"
                      contextsArray={[FlowContextName.flow]}
                      externalContextData={{ entityId: campaign.id }}
                      prefixDataTestId="campaigns-update-campaign"
                      accessToken={accessToken}
                      emptyStateBehavior="disable"
                      deferMainContextRequestsUntilClick
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  <div>
                    <div className="gba:font-medium">{campaign.name || '-'}</div>
                    {campaign.description && (
                      <div className="gba:text-sm gba:truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {campaign.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  {campaign.type?.value || '-'}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  {formatDate(campaign.startDate)}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  {formatDate(campaign.endDate)}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6" data-testid={`campaign-status-cell-${campaign.id}`}>
                  {(() => {
                    const statusText = getCampaignStatus(campaign.startDate, campaign.endDate);
                    return (
                      <StatusBadge
                        status={mapStatusToVariant(statusText)}
                        leftLabel={statusText}
                        size="sm"
                        style={getStatusStyles(statusText)}
                        data-testid={`campaign-status-pill-${campaign.id}`}
                      />
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {campaigns.length === 0 && !isLoading && (
        <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }} data-testid="campaigns-empty">
          {getTranslationFromI18nKeyAndLabel('campaigns.table.noData', 'No campaigns found')}
        </div>
      )}
    </div>
  );
};

export default CampaignsTable; 