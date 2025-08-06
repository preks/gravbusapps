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
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { SalesCampaign } from '../types/SalesCampaignTypes';
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
  accessToken
}) => {
  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY');
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
            onClick={onTableChange} 
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
              <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.actions', 'Actions')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.name', 'Name')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.type', 'Campaign Type')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.startDate', 'Start Date')}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                {getTranslationFromI18nKeyAndLabel('campaigns.table.endDate', 'End Date')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                <TableCell className="gba:py-4 gba:px-6">
                  <div className="gba:flex gba:justify-start gba:gap-2">
                    <AppActionButton
                      data-testid={`campaigns-update-campaign-button-${campaign.id}`}
                      variant="secondary"
                      contextsArray={[FlowContextName.entityContext]}
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
                      <div className="gba:text-sm gba:text-gray-500 gba:truncate">
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {campaigns.length === 0 && !isLoading && (
        <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid="campaigns-empty">
          {getTranslationFromI18nKeyAndLabel('campaigns.table.noData', 'No campaigns found')}
        </div>
      )}
    </div>
  );
};

export default CampaignsTable; 