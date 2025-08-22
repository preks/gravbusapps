import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, Spinner } from '@newwork/nw-design-system';
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/kanban-board';
import { InvestmentOpportunity } from '@/common/data/investment/types/investmentRelationTypes';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { formatCurrency, formatDate, getOpportunityStageVariant } from '../../utils';
import { DollarSign, Calendar, Building2, Target, Clock, Move } from 'lucide-react';
import { Badge } from '@newwork/nw-design-system';

interface OpportunityBoardProps extends BusinessAppContextProps {
  opportunities?: InvestmentOpportunity[];
  stages: KanbanStage[];
  isLoading?: boolean;
  isLoadingStages?: boolean;
}

export const OpportunityBoard: React.FC<OpportunityBoardProps> = ({ 
  accessToken, 
  opportunities: propOpportunities = [], 
  stages: propStages = [],
  isLoading: propIsLoading = false,
  isLoadingStages = false
}) => {

  // Transform opportunities to kanban items
  const kanbanItems = useMemo(() => {
    return propOpportunities.map(opp => ({
      id: opp.id,
      name: opp.name || 'Unnamed Opportunity',
      description: opp.account?.name,
      stageId: opp.opportunityPipelineStage?.id || opp.opportunityStatus?.code || 'prospecting',
      position: 0,
      opportunityData: opp
    }));
  }, [propOpportunities]);



  // Handle item movement between stages
  const handleItemMove = useCallback((itemId: string, toStageId: string, position?: number) => {
    // TODO: Implement opportunity stage update via API
    console.log(`Moving opportunity ${itemId} to ${toStageId} at position ${position}`);
    
    // For now, just reload opportunities to show the change
    // This would be replaced with an actual API call
  }, []);

  // Custom render function for opportunity cards
  const renderOpportunityCard = useCallback((item: KanbanItem) => {
    const opp = item.opportunityData as InvestmentOpportunity;
    
    return (
      <Card className="gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow">
        <CardContent className="gba:p-3 gba:space-y-3">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <h4 className="gba:font-medium gba:text-sm gba:text-gray-900 gba:dark:text-gray-100 gba:line-clamp-2">
                {opp.name || 'Unnamed Opportunity'}
              </h4>
              {opp.account?.name && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600 gba:mt-1">
                  <Building2 className="gba:h-3 gba:w-3" />
                  <span className="gba:text-xs">{opp.account.name}</span>
                </div>
              )}
            </div>
            
            <Badge variant={getOpportunityStageVariant(opp.opportunityStatus?.code || '')}>
              {opp.opportunityStatus?.code || 'Unknown'}
            </Badge>
          </div>
          
          {opp.estimatedAmount && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
              <DollarSign className="gba:h-3 gba:w-3" />
              <span className="gba:font-medium">{formatCurrency(opp.estimatedAmount)}</span>
            </div>
          )}
          
          {opp.closeDate && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
              <Calendar className="gba:h-3 gba:w-3" />
              <span>{formatDate(opp.closeDate)}</span>
            </div>
          )}
        </CardContent>
        
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-3 gba:pt-2 gba:border-t gba:px-3 gba:pb-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Move className="gba:h-3 gba:w-3 gba:text-gray-400" />
            <span className="gba:text-xs gba:text-gray-500">Drag to move</span>
          </div>
          <AppActionButton
            data-testid={`opportunity-update-button-${opp.id}`}
            size="sm"
            contextsArray={[FlowContextName.opportunityEntity]}
            externalContextData={{ opportunityId: opp.id }}
            prefixDataTestId={`opportunity-update`}
            accessToken={accessToken}
            emptyStateBehavior="disable"
            deferMainContextRequestsUntilClick
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </Card>
    );
  }, [accessToken]);

  // Custom render function for stage headers
  const renderStageHeader = useCallback((stage: KanbanStage, itemCount: number) => {
    const stageConfig = {
      'prospecting': { icon: Target, color: 'default' },
      'qualification': { icon: Clock, color: 'secondary' },
      'proposal': { icon: Target, color: 'outline' },
      'negotiation': { icon: Target, color: 'outline' },
      'closed-won': { icon: Target, color: 'success' },
      'closed-lost': { icon: Target, color: 'destructive' }
    };

    const config = stageConfig[stage.id as keyof typeof stageConfig] || { icon: Target, color: 'default' };
    const IconComponent = config.icon;

    return (
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <IconComponent className="gba:h-4 gba:w-4" />
          <h3 className="gba:font-medium gba:text-sm">{stage.name}</h3>
          <Badge variant={config.color as any} className="gba:ml-2">
            {itemCount}
          </Badge>
        </div>
      </div>
    );
  }, []);



  return (
    <div className="gba:space-y-6" data-testid="opportunity-board">
                      <div className="gba:flex gba:items-center gba:justify-between">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Opportunities Board</h2>
          <div className="gba:text-sm gba:text-gray-500">
            {propOpportunities.length} opportunities
          </div>
        </div>



      {/* Loading States for Stages */}
      {isLoadingStages ? (
        <Card>
          <CardContent className="gba:p-8">
            <div className="gba:flex gba:items-center gba:justify-center gba:text-center">
              <div>
                <Spinner size="lg" />
                <p className="gba:mt-4 gba:text-gray-500">Loading pipeline stages...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : propStages.length === 0 && !isLoadingStages ? (
        <Card data-testid="no-stages-message">
          <CardContent className="gba:p-8">
            <div className="gba:text-center">
              <div className="gba:text-6xl gba:mb-4">📋</div>
              <h3 className="gba:text-xl gba:font-semibold gba:text-gray-700 gba:mb-2">
                No Stages for This Pipeline
              </h3>
              <p className="gba:text-gray-500 gba:mb-4">
                This pipeline doesn't have any stages configured yet.
              </p>
              <p className="gba:text-sm gba:text-gray-400">
                Configure stages in the pipeline settings to start organizing opportunities.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          stages={propStages}
          items={kanbanItems}
          onDragEnd={handleItemMove}
          renderCard={renderOpportunityCard}
          renderStageHeader={renderStageHeader}
          loading={propIsLoading}
          emptyStateMessage="No opportunities available in this pipeline."
          className="gba:min-h-[600px]"
        />
      )}
    </div>
  );
};
