import React, { useState, useEffect, useCallback } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Alert,
  Button
} from "@newwork/nw-design-system";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { 
  List, 
  Grid3X3, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Building2, 
  Calendar, 
  User,
  Award
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { ColumnConfig } from "@/components/dataController";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { OpportunityBoard } from "@/business-apps/crm/investments/apps/investment-relations/views/opportunity-view/components/opportunity-board/OpportunityBoard";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import { useExitOpportunitiesData } from "./hooks/useExitOpportunitiesData";
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';

interface ExitOpportunitiesProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const ExitOpportunities: React.FC<ExitOpportunitiesProps> = ({
  accessToken,
  userInfo,
  initialSubTab = "list",
  onSubTabChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // Created date range state (creation date)
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined);
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined);
  // Owner backend search
  const { employees: employeeOptions, search: searchEmployees, loading: loadingEmployees, error: employeeError } = useEmployeeSearch(accessToken);

  const context = { accessToken, userInfo };

  const {
    opportunities,
    metrics,
    total,
    loading,
    error,
    loadPage,
  } = useExitOpportunitiesData({
    search: searchTerm,
    sortField,
    sortOrder,
    context,
    statusFilter: "active", // Exclude WON opportunities (those are for Sales tab)
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  const handleRowClick = useCallback((opportunityId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/opportunity-record', { 
      opportunityId,
      fromView: 'divestments',
      fromSubView: 'exit-opportunities'
    });
    navigateTo(detailsUrl);
  }, []);



  useEffect(() => {
    const ownerIds = selectedFilters.filter((id) => !id.startsWith('InvestmentGroup:') && !id.startsWith('InvestmentType:') && !id.startsWith('OpportunityStatus:'));
    loadPage(
      currentPage,
      pageSize,
      {
        search: searchTerm,
        ownerEmployeeIds: ownerIds,
        createdAfter,
        createdBefore,
      }
    );
  }, [loadPage, currentPage, searchTerm, sortField, sortOrder, selectedFilters, createdAfter, createdBefore]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('ExitOpportunities: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('ExitOpportunities: Process completed successfully, refreshing exit opportunities data');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.opportunity || 
            response?.investment) {
          console.log('ExitOpportunities: Opportunity/Investment data detected, refreshing exit opportunities list');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('ExitOpportunities: Continue event with payload detected, refreshing data');
          loadPage(currentPage, pageSize);
        }
      } catch (err) {
        console.error('Error handling process completion in ExitOpportunities:', err);
      }
    };

    // Listen to multiple possible event names for updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion);
      });
    };
  }, [loadPage, currentPage, pageSize]);

  const handleTabChange = (value: string) => {
    onSubTabChange?.(value);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("DESC");
    }
    setCurrentPage(1);
  };

  // Using OpportunityList for rendering the table to avoid incompatible Table API

  // Column visibility for Exit Opportunities
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'opportunity', label: 'Opportunity', visible: true },
    { id: 'investment', label: 'Investment', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'stage', label: 'Stage', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'probability', label: 'Probability', visible: true },
    { id: 'closeDate', label: 'Close Date', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Created', visible: false },
  ]);

  const visibleColumns = columnConfig.filter(c => c.visible).map(c => c.id);
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(c => c.id === columnId ? { ...c, visible } : c));
  }, []);

  // Map filters to visible columns
  const columnToFilterMap: Record<string, string> = {
    opportunity: 'opportunityName',
    investment: 'investmentName',
    amount: 'amountRange',
    stage: 'stage',
    status: 'opportunityStatus',
    probability: 'probabilityRange',
    closeDate: 'closeDate',
    owner: 'owner',
    created: 'creationDate',
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    const widgets: WidgetItem[] = [
      {
        key: "total-opportunities",
        title: getTranslationFromI18nKeyAndLabel("total_opportunities", "Total Opportunities"),
        value: metrics.totalCount,
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme for opportunities
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("active_exit_opportunities", "Active exit opportunities"),
        trend: {
          value: `${metrics.totalCount} ${getTranslationFromI18nKeyAndLabel("active", "active")}`,
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("ready_for_divestment", "ready for divestment")
        }
      },
      {
        key: "total-value",
        title: getTranslationFromI18nKeyAndLabel("total_value", "Total Value"),
        value: formatCurrency(metrics.totalValue),
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for value
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("estimated_opportunity_value", "Estimated opportunity value"),
        trend: {
          value: formatCurrency(metrics.totalValue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("total_pipeline", "total pipeline")
        }
      },
      {
        key: "average-value",
        title: getTranslationFromI18nKeyAndLabel("average_value", "Average Value"),
        value: formatCurrency(metrics.averageValue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for averages
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_opportunity_size", "Average opportunity size"),
        trend: {
          value: formatCurrency(metrics.averageValue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_opportunity", "per opportunity")
        }
      },
      {
        key: "average-win-rate",
        title: getTranslationFromI18nKeyAndLabel("average_win_rate", "Average Win Rate"),
        value: `${metrics.averageWinRate.toFixed(1)}%`,
        prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-orange-600" />,
        color: '#fa8c16', // Orange theme for win rate
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("success_probability", "Success probability"),
        trend: {
          value: `${metrics.averageWinRate.toFixed(1)}% ${getTranslationFromI18nKeyAndLabel("win_rate", "win rate")}`,
          positive: metrics.averageWinRate > 50,
          description: getTranslationFromI18nKeyAndLabel("conversion_rate", "conversion rate")
        }
      }
    ];

    return (
      <WidgetGroup
        widgets={widgets}
        isLoading={loading}
        error={error}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel("no_metrics_available", "No metrics available")}
        data-testid="exit-opportunities-metrics"
      />
    );
  };

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('open')) return "default";
    if (statusLower.includes('won') || statusLower.includes('success')) return "secondary";
    if (statusLower.includes('lost') || statusLower.includes('failed')) return "destructive";
    return "outline";
  };

  // Helper function to get stage badge variant
  const getStageBadgeVariant = (stage?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!stage) return "outline";
    const stageLower = stage.toLowerCase();
    if (stageLower.includes('discovery')) return "default";
    if (stageLower.includes('qualification')) return "secondary";
    if (stageLower.includes('negotiation')) return "default";
    return "outline";
  };

  const renderOpportunityTable = () => {
    if (loading && opportunities.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Spinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span>Error loading exit opportunities: {error instanceof Error ? error.message : String(error)}</span>
            <Button variant="outline" size="sm" onClick={() => loadPage(currentPage, pageSize)}>
              Retry
            </Button>
          </div>
        </Alert>
      );
    }

    return (
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'exit-opportunities-column-visibility'
          },
          dateRange: {
            createdAfter,
            createdBefore,
            onClear: () => { setCreatedAfter(undefined); setCreatedBefore(undefined); }
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Exit Opportunities</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentOpportunity]}
              accessToken={accessToken}
              data-testid="exit-opportunities-add-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="exit-opportunities-add-action"
                type="button"
              >
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                  Add
                </span>
              </button>
            </AppAction>
          ),
        }}
        dataFilterProps={{
          filterGroups: [
            {
              id: 'opportunityName',
              title: 'Opportunity',
              filters: [],
              customComponent: React.createElement('input', {
                value: searchTerm,
                onChange: (e: any) => handleSearch(e?.target?.value || ''),
                placeholder: 'Search opportunity name',
                className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
              }),
              hideSearch: true,
            },
            {
              id: 'investmentName',
              title: 'Investment',
              filters: [],
              customComponent: React.createElement('input', {
                value: '',
                onChange: () => {},
                placeholder: 'Search investment',
                className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
              }),
              hideSearch: true,
            },
            {
              id: 'amountRange',
              title: 'Amount',
              filters: [],
              customComponent: React.createElement('div', null),
              hideSearch: true,
            },
            {
              id: 'stage',
              title: 'Stage',
              filters: [
                { id: 'OpportunityPipelineStage:v1:QUALIFICATION', label: 'In Qualification', selected: selectedFilters.includes('OpportunityPipelineStage:v1:QUALIFICATION') },
                { id: 'OpportunityPipelineStage:v1:NEGOTIATION', label: 'Negotiation', selected: selectedFilters.includes('OpportunityPipelineStage:v1:NEGOTIATION') },
              ],
            },
            {
              id: 'opportunityStatus',
              title: 'Investment Group',
              filters: [
                { id: 'OpportunityStatus:v1:OPEN', label: 'Open', selected: selectedFilters.includes('OpportunityStatus:v1:OPEN') },
                { id: 'OpportunityStatus:v1:QUALIFIED', label: 'Qualified', selected: selectedFilters.includes('OpportunityStatus:v1:QUALIFIED') },
                { id: 'OpportunityStatus:v1:WON', label: 'Won', selected: selectedFilters.includes('OpportunityStatus:v1:WON') },
              ],
            },
            {
              id: 'owner',
              title: 'Owner',
              filters: [],
              backendSearch: (q: string) => {
                const term = (q || '').trim();
                if (term.length >= 2) {
                  void searchEmployees(term);
                }
                const opts = (employeeOptions || []).map((e) => ({ id: e.id, label: e.displayName, value: e.id, selected: selectedFilters.includes(e.id) }));
                return { filters: term.length >= 2 ? opts : [], loading: loadingEmployees, error: employeeError } as any;
              },
            },
            {
              id: 'creationDate',
              title: 'Created Date',
              filters: [],
              customComponent: (
                <DateRangeFilter
                  createdAfter={createdAfter}
                  createdBefore={createdBefore}
                  onDateRangeChange={(after?: string, before?: string) => { setCreatedAfter(after); setCreatedBefore(before); }}
                  className='gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
                />
              ),
              hideSearch: true,
            }
          ].filter(g => {
            // show only when corresponding columns are visible
            const targetCol = Object.keys(columnToFilterMap).find(c => columnToFilterMap[c] === g.id);
            return targetCol ? visibleColumns.includes(targetCol) : true;
          }),
          onFilterChange: (id, checked) => {
            setSelectedFilters((prev) => checked ? [...prev, id] : prev.filter(f => f !== id));
          },
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('opportunity') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('name')}>Opportunity</TableHead>)}
                  {visibleColumns.includes('investment') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('investmentName')}>Investment</TableHead>)}
                  {visibleColumns.includes('amount') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('estimatedAmount')}>Amount</TableHead>)}
                  {visibleColumns.includes('stage') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityPipelineStage')}>Stage</TableHead>)}
                  {visibleColumns.includes('status') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityStatus')}>Status</TableHead>)}
                  {visibleColumns.includes('probability') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('probability')}>Probability</TableHead>)}
                  {visibleColumns.includes('closeDate') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('closeDate')}>Close Date</TableHead>)}
                  {visibleColumns.includes('owner') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('ownerEmployee')}>Owner</TableHead>)}
                  {visibleColumns.includes('created') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('createdAt')}>Created</TableHead>)}
                  {visibleColumns.includes('actions') && (<TableHead className="gba:w-[60px]">Actions</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opportunity) => (
                  <TableRow 
                    key={opportunity.id} 
                    className="gba:cursor-pointer" 
                    onClick={() => handleRowClick(opportunity.id)}
                  >
                    {visibleColumns.includes('opportunity') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{opportunity.name}</span>
                          {opportunity.code && (
                            <span className="gba:text-sm gba:text-gray-500">{opportunity.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('investment') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.investmentName || opportunity.account?.name || "N/A"}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('amount') && (<TableCell>
                      <span className="gba:font-medium">
                        {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>)}
                    {visibleColumns.includes('stage') && (<TableCell>
                      <Badge variant={getStageBadgeVariant(opportunity.opportunityPipelineStage?.value)}>
                        {opportunity.opportunityPipelineStage?.value || opportunity.stage?.value || "Unknown"}
                      </Badge>
                    </TableCell>)}
                    {visibleColumns.includes('status') && (<TableCell>
                      <Badge variant={getStatusBadgeVariant(opportunity.opportunityStatus?.value)}>
                        {opportunity.opportunityStatus?.value || "Unknown"}
                      </Badge>
                    </TableCell>)}
                    {visibleColumns.includes('probability') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Award className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.probability ? `${opportunity.probability}%` : "N/A"}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('closeDate') && (<TableCell>
                      {opportunity.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(opportunity.closeDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>)}
                    {visibleColumns.includes('owner') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {opportunity.ownerEmployee?.displayName || 
                           opportunity.ownerEmployee?.firstName && opportunity.ownerEmployee?.lastName
                             ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('created') && (
                      <TableCell>
                        <span>{formatDate((opportunity as any).createdAt)}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('actions') && (<TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`exit-opportunity-update-button-${opportunity.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentOpportunityEntity]}
                          externalContextData={{ opportunityId: opportunity.id }}
                          prefixDataTestId={`exit-opportunity-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
    );
  };

  return (
    <div data-testid="exit-opportunities-container" className="gba:space-y-6">
      {/* Metrics */}
      {renderMetrics()}

      <Tabs value={initialSubTab} onValueChange={handleTabChange} className="gba:mt-6">
        <TabsList className="gba:grid gba:w-full gba:max-w-md gba:grid-cols-2">
          <TabsTrigger 
            value="list" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="exit-opportunities-list-tab"
          >
            <List className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel("list_view", "List View")}
          </TabsTrigger>
          <TabsTrigger 
            value="board" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="exit-opportunities-board-tab"
          >
            <Grid3X3 className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel("board_view", "Board View")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {renderOpportunityTable()}
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel("exit_opportunities_board", "Exit Opportunities Board")}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                "exit_opportunities_board_desc",
                "Kanban board view of opportunities related to investments planned for exit"
              )}
            </p>
          </div>
          <OpportunityBoard
            accessToken={accessToken}
            userInfo={userInfo}
            dealType="DIVESTMENT_DEAL"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExitOpportunities;
