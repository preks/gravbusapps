import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Spinner, 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Label,
  Badge
} from '@newwork/nw-design-system';
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/kanban-board';
import { InvestmentOpportunity } from '@/common/data/investment/types/investmentRelationTypes';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGenericPipelines } from '@/components/kanban-board/hooks/useGenericPipelines';
import { useGenericPipelineStages } from '@/components/kanban-board/hooks/useGenericPipelineStages';
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities';
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries';

import { formatCurrency } from '../../utils';
import { Calendar, Building2, Clock, FileText } from 'lucide-react';
import { UserOutlined } from '@ant-design/icons';
import { EmployeeSelector } from './EmployeeSelector';
import { startProcess } from '@/common/utils/start-process';



interface OpportunityBoardProps extends BusinessAppContextProps {
  // Board loads its own stages based on selected pipeline
  dealType?: string; // Optional dealType filter (INVESTMENT_DEAL, DIVESTMENT_DEAL)
}



export const OpportunityBoard: React.FC<OpportunityBoardProps> = ({ 
  accessToken,
  userInfo,
  dealType = "INVESTMENT_DEAL" // Default to investment deals
}) => {
  // Filter states
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [opportunityFilter, setOpportunityFilter] = useState<"my" | "all" | "selected">("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Data state
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track recent process starts to prevent duplicates
  const [recentProcessStarts, setRecentProcessStarts] = useState<Set<string>>(new Set());

  // Hooks for data fetching
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities({ accessToken, userInfo });
  const { pipelines } = useGenericPipelines(accessToken, "InvestmentOpportunityPipeline");
  const { stages, isLoading: isLoadingStages } = useGenericPipelineStages(
    accessToken,
    "InvestmentOpportunityPipelineStage",
    selectedPipelineId || undefined
  );

  // Build query variables based on filters
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => {
    const variables: InvestmentOpportunityQueryVariables = {
      limit: 200, // Higher limit for board view
      orderBy: [{ field: "createdAt", direction: "DESC_NULLS_LAST" }],
      dealType: dealType, // Filter by provided dealType
    };

    // Add pipeline filter - always filter by selected pipeline
    if (selectedPipelineId) {
      variables.pipelineIds = [selectedPipelineId];
    }

    // Add employee filter
    if (opportunityFilter === "my" && userInfo?.employeeDetails?.employeeId) {
      variables.ownerEmployeeIds = [userInfo.employeeDetails.employeeId];
    } else if (opportunityFilter === "selected") {
      if (selectedEmployeeIds.length > 0) {
        // Filter by selected employees
        variables.ownerEmployeeIds = selectedEmployeeIds;
      } else {
        // No employees selected - use a non-existent ID to show no results
        variables.ownerEmployeeIds = ["00000000-0000-0000-0000-000000000000"];
      }
    }
    // "all" mode: no employee filtering - shows all opportunities

    return variables;
  }, [selectedPipelineId, opportunityFilter, selectedEmployeeIds, userInfo?.employeeDetails?.employeeId, dealType]);

  // Load opportunities data
  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setError(null);

    try {
      const result = await fetchInvestmentOpportunities(queryVariables);
      setOpportunities(result.InvestmentOpportunity || []);
    } catch (err) {
      console.error("Error loading investment opportunities:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    }
  }, [accessToken, fetchInvestmentOpportunities, queryVariables]);

  // Set default pipeline when pipelines load
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  // Handle initial loading state
  useEffect(() => {
    if (selectedPipelineId && isInitialLoading) {
      setIsInitialLoading(false);
    }
  }, [selectedPipelineId, isInitialLoading]);

  // Load data when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);







  // Map opportunities to kanban items
  const kanbanItems: KanbanItem[] = useMemo(() => {
    return opportunities.map(opp => ({
      id: opp.id,
      name: opp.name || 'Unnamed Opportunity',
      description: opp.account?.name,
      stageId: opp.opportunityPipelineStage?.id || '',
      position: 0,
      // Store the full opportunity data for rendering
      opportunityData: opp
    }));
  }, [opportunities]);

  // Render function for opportunity cards
  const renderCard = useCallback((item: KanbanItem) => {
    const opp = item.opportunityData as InvestmentOpportunity;
    
    // Format dates
    let formattedCloseDate = "";
    if (opp.closeDate) {
      const closeDate = new Date(opp.closeDate);
      formattedCloseDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(closeDate);
    }
    
    let formattedCreatedAt = "";
    if (opp.createdAt) {
      const createdDate = new Date(opp.createdAt);
      formattedCreatedAt = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(createdDate);
    }
    
    const amount = opp.forecastedProfitAmount || opp.estimatedAmount || 0;
    const companyName = opp.account?.name || '';
    const ownerName = opp.ownerEmployee?.firstName && opp.ownerEmployee?.lastName 
      ? `${opp.ownerEmployee.firstName} ${opp.ownerEmployee.lastName}` 
      : opp.ownerEmployee?.displayName || '';

    return (
      <div
        className="gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:flex gba:flex-col"
        data-testid={`opportunity-card-${opp.id}`}
      >
        <div className="gba:p-3 gba:space-y-2">
          <div>
            <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
              <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">
                {opp.name || 'Unnamed Opportunity'}
              </span>
            </h4>
            <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1 gba:mt-1">
              {companyName}
            </p>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-md gba:font-bold gba:text-gray-900 gba:dark:text-gray-100">
              {formatCurrency(amount)}
            </span>
            {formattedCloseDate && (
              <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
                <Calendar className="gba:h-3 gba:w-3 gba:mr-1" />
                {formattedCloseDate}
              </div>
            )}
          </div>
        </div>

        <div className="gba:p-3 gba:pt-0 gba:border-t gba:border-gray-100 gba:dark:border-gray-800">
          {companyName && (
            <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:mb-2">
              <Building2 className="gba:h-3 gba:w-3 gba:mr-1" />
              {companyName}
            </div>
          )}
          
          <div className="gba:flex gba:justify-between gba:items-center">
            {ownerName && (
              <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
                <UserOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
                {ownerName}
              </div>
            )}
            
            {formattedCreatedAt && (
              <div className="gba:flex gba:items-center gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:ml-auto">
                <Clock className="gba:h-3 gba:w-3 gba:mr-1" />
                {formattedCreatedAt}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, []);

  // Custom render function for stage headers
  const renderStageHeader = useCallback((stage: KanbanStage, itemCount: number) => {
    // Calculate total amount for opportunities in this stage
    const stageOpportunities = opportunities.filter(opp => 
      opp.opportunityPipelineStage?.id === stage.id
    );
    const totalAmount = stageOpportunities.reduce((sum, opp) => 
      sum + (opp.forecastedProfitAmount || opp.estimatedAmount || 0), 0
    );

    return (
      <div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:font-medium gba:text-sm" data-testid={`stage-title-${stage.id}`}>
            {stage.name}
          </h3>
        </div>
        
        <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:pt-1">
          <div>
            <span className="gba:font-medium" data-testid={`stage-total-${stage.id}`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div>
            <span className="gba:font-medium">{itemCount}</span>{" "}
            {itemCount === 1 ? "deal" : "deals"}
          </div>
        </div>
      </div>
    );
  }, [opportunities]);

  // Handle drag end events
  const handleDragEnd = useCallback((itemId: string, toStageId: string) => {
    const opportunity = opportunities.find(op => op.id === itemId);
    if (!opportunity) return;

    const currentStageId = opportunity.opportunityPipelineStage?.id;
    if (currentStageId === toStageId) {
      // Same stage - handle reordering if needed
      // Note: Reordering is disabled via allowReorderWithinStage={false}
      return;
    } else {
      // Different stage - start transition process
      
      // Create a unique key for this transition to prevent duplicates
      const transitionKey = `${itemId}-${currentStageId}-${toStageId}`;
      
      // Check if we've recently started this process
      if (recentProcessStarts.has(transitionKey)) {
        return;
      }
      
      // Mark this transition as in progress
      setRecentProcessStarts(prev => new Set(prev).add(transitionKey));
      
      // Clear the flag after 3 seconds to allow legitimate retries
      setTimeout(() => {
        setRecentProcessStarts(prev => {
          const newSet = new Set(prev);
          newSet.delete(transitionKey);
          return newSet;
        });
      }, 3000);
      
      startProcess({
        domain: 'investment-relations',
        processName: 'transitionInvestmentOpportunity',
        payload: {
          opportunityId: itemId,
          targetStageRef: toStageId,
        },
        builderType: 'NATIVE_SCREEN',
      });
      
      // Optionally reload data after a short delay to reflect changes
      setTimeout(() => {
        loadData();
      }, 1000);
    }
  }, [opportunities, loadData, recentProcessStarts]);



  // Handle filter changes
  const handleOpportunityFilterChange = (value: string) => {
    setOpportunityFilter(value as "my" | "all" | "selected");
    if (value !== "selected") {
      setSelectedEmployeeIds([]);
    }
  };

  const handlePipelineChange = (value: string) => {
    setSelectedPipelineId(value);
  };

  const handleEmployeeSelectionChange = (employeeIds: string[]) => {
    setSelectedEmployeeIds(employeeIds);
  };

  return (
    <div className="gba:space-y-6" data-testid="opportunity-board">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Opportunities Board</h2>
        <Badge variant="outline" className="gba:text-sm">
          {opportunities.length} opportunities
        </Badge>
      </div>

      {/* Filters Section */}
      <div className="gba:mb-6 gba:p-4 gba:bg-gray-50 gba:rounded-lg">
        <div className="gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
          {/* Opportunity Filter */}
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label className="gba:text-sm gba:font-medium">Filter by:</Label>
            <RadioGroup
              value={opportunityFilter}
              onValueChange={handleOpportunityFilterChange}
              className="gba:flex gba:gap-4"
            >
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="my" id="my-opportunities-board" />
                <Label htmlFor="my-opportunities-board">My Opportunities</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="all" id="all-opportunities-board" />
                <Label htmlFor="all-opportunities-board">All Opportunities</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="selected" id="selected-employees-board" />
                <Label htmlFor="selected-employees-board">Selected Employees</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
          {/* Pipeline Selection on second line */}
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label className="gba:text-sm gba:font-medium">Pipeline:</Label>
            <Select value={selectedPipelineId} onValueChange={handlePipelineChange}>
              <SelectTrigger className="gba:w-48">
                <SelectValue placeholder="Select Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines?.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Selection - Only show when "Selected Employees" is chosen */}
          {opportunityFilter === "selected" && (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className="gba:text-sm gba:font-medium">Employees:</Label>
              <EmployeeSelector
                accessToken={accessToken}
                userInfo={userInfo}
                selectedEmployeeIds={selectedEmployeeIds}
                onEmployeeSelectionChange={handleEmployeeSelectionChange}
                disabled={opportunityFilter !== "selected"}
              />
            </div>
          )}
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
      ) : stages.length === 0 && !isLoadingStages ? (
        <Card data-testid="no-stages-message">
          <CardContent className="gba:p-8">
            <div className="gba:text-center">
              <div className="gba:flex gba:justify-center gba:mb-4">
                <FileText className="gba:h-16 gba:w-16 gba:text-gray-400" />
              </div>
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
      ) : error ? (
        <Card>
          <CardContent className="gba:p-8">
            <div className="gba:text-center">
              <div className="gba:text-red-500 gba:text-6xl gba:mb-4">⚠️</div>
              <h3 className="gba:text-xl gba:font-semibold gba:text-gray-700 gba:mb-2">
                Error Loading Opportunities
              </h3>
              <p className="gba:text-gray-500 gba:mb-4">{error}</p>
              <button 
                onClick={loadData}
                className="gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          stages={stages}
          items={kanbanItems}
          onDragEnd={handleDragEnd}
          renderCard={renderCard}
          renderStageHeader={renderStageHeader}
          loading={isInitialLoading}
          allowReorderWithinStage={false}
          className="gba:w-full"
        />
      )}
    </div>
  );
};
