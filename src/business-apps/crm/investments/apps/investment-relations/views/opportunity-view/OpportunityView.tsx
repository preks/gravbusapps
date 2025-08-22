import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Label,
  Spinner,
  Alert,
  Button
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentOpportunities } from "@/common/data/investment/hooks/useInvestmentOpportunities";
import { useGenericPipelines } from "@/components/kanban-board/hooks/useGenericPipelines";
import { useGenericPipelineStages } from "@/components/kanban-board/hooks/useGenericPipelineStages";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import type { InvestmentOpportunityQueryVariables } from "@/common/data/investment/queries/investmentOpportunityQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { OpportunityStatistics } from "./components/OpportunityStatistics";
import { OpportunityList } from "./components/OpportunityList";
import { OpportunityBoard } from "./components/opportunity-board/OpportunityBoard";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { PlusSquareIcon } from "@phosphor-icons/react";

export interface OpportunityViewProps extends BusinessAppContextProps {}

export const OpportunityView: React.FC<OpportunityViewProps> = (context) => {
  const { accessToken, userInfo } = context;
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // const [showDataFilter, setShowDataFilter] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  
  // Filter states
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("all");
  const [opportunityFilter, setOpportunityFilter] = useState<"my" | "all" | "selected">("all");
  const [selectedEmployeeIds] = useState<string[]>([]);

  // Hooks for data fetching
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);
  const { pipelines } = useGenericPipelines(accessToken, "InvestmentOpportunityPipeline");
  const { stages, isLoading: isLoadingStages } = useGenericPipelineStages(
    accessToken,
    "InvestmentOpportunityPipelineStage",
    selectedPipelineId === "all" ? undefined : selectedPipelineId
  );

  // Data state
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query variables
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => {
    const variables: InvestmentOpportunityQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...selectedFilters
    };

    // Add pipeline filter
    if (selectedPipelineId !== "all") {
      variables.pipelineIds = [selectedPipelineId];
    }

    // Add employee filter
    if (opportunityFilter === "my" && userInfo?.employeeDetails?.employeeId) {
      variables.ownerEmployeeIds = [userInfo.employeeDetails.employeeId];
    } else if (opportunityFilter === "selected" && selectedEmployeeIds.length > 0) {
      variables.ownerEmployeeIds = selectedEmployeeIds;
    }

    return variables;
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, selectedPipelineId, opportunityFilter, userInfo?.employeeDetails?.employeeId, selectedEmployeeIds]);

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestmentOpportunities(queryVariables);
      setOpportunities(result.InvestmentOpportunity || []);
      setTotalCount(result.InvestmentOpportunityAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('Error loading investment opportunities:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestmentOpportunities, queryVariables]);

  // Load data on mount and when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("ASC");
    }
  }, [sortField, sortOrder]);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // Handle pipeline selection
  const handlePipelineChange = useCallback((pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setCurrentPage(1);
  }, []);

  // Handle opportunity filter change
  const handleOpportunityFilterChange = useCallback((filter: "my" | "all" | "selected") => {
    setOpportunityFilter(filter);
    setCurrentPage(1);
  }, []);

  // Loading state
  if (isLoading && opportunities.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading opportunities: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-opportunities-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Opportunities</h1>
            <p className="gba:text-gray-600">Manage investment opportunities and pipeline stages</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <OpportunityStatistics {...context} />
      </div>

      {/* Filters and Pipeline Selection */}
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
                <RadioGroupItem value="my" id="my-opportunities" />
                <Label htmlFor="my-opportunities">My Opportunities</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="all" id="all-opportunities" />
                <Label htmlFor="all-opportunities">All Opportunities</Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="selected" id="selected-employees" />
                <Label htmlFor="selected-employees">Selected Employees</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Pipeline Selection */}
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label className="gba:text-sm gba:font-medium">Pipeline:</Label>
            <Select value={selectedPipelineId} onValueChange={handlePipelineChange}>
              <SelectTrigger className="gba:w-48">
                <SelectValue placeholder="Select Pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pipelines</SelectItem>
                {pipelines?.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="board">Board View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {/* Data Container with Opportunity List */}
          <DataContainer
            dataControllerProps={{
              search: searchTerm,
              setSearch: handleSearch,
              debounceDelay: 500,
              filter: selectedFilters,
              setFilter: handleSetFilter,
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>Opportunities</span>
                    <span className="gba:text-gray-500">({totalCount})</span>
                  </div>
                </div>
              ),
              actions: (
                <AppAction
                  contextsArray={[FlowContextName.createInvestmentOpportunity]}
                  accessToken={accessToken}
                  data-testid="add-opportunity-action"
                  emptyStateBehavior="hide"
                >
                  <button
                    className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                    data-testid="add-opportunity-action"
                    type="button"
                  >
                    <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                      <PlusSquareIcon />
                    </span>
                    <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                      Add
                    </span>
                  </button>
                </AppAction>
              ),
            }}
            dataFilterProps={{
              filterGroups: [], // TODO: Add proper filter groups when available
              onFilterChange: () => {}, // TODO: Implement filter change handler
            }}
            dataBody={
              <OpportunityList {...context} />
            }
          />
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <OpportunityBoard
            opportunities={opportunities}
            stages={stages || []}
            isLoading={isLoading}
            isLoadingStages={isLoadingStages}
            {...context}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpportunityView;