import React, { useState, useCallback, useEffect, useRef } from "react";
import {
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
import { Building2, Calendar, User, ChevronUp, ChevronDown } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { ColumnConfig } from "@/components/dataController";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
// no i18n usage here
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import PlannedExitsMetrics from "./components/PlannedExitsMetrics";
import { usePlannedExitsData } from "./hooks/usePlannedExitsData";
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import ExpenseAmountRangeFilter from '@/business-apps/fin/expenses/apps/personal-expenses/components/tabs/expense-items-tab/ExpenseAmountRangeFilter';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';

interface PlannedExitsProps extends BusinessAppContextProps {}

const PlannedExits: React.FC<PlannedExitsProps> = ({ accessToken }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState<string>("plannedExitDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // Custom filter state for column-specific filters
  const [investmentName, setInvestmentName] = useState("");
  const [initialRange, setInitialRange] = useState<{ min?: number; max?: number } | null>(null);
  const [marketRange, setMarketRange] = useState<{ min?: number; max?: number } | null>(null);
  const [performanceRange, setPerformanceRange] = useState<{ min?: number; max?: number } | null>(null); // not applied server-side
  const [stakeRange, setStakeRange] = useState<{ min?: number; max?: number } | null>(null);
  const [plannedAfter, setPlannedAfter] = useState<string | undefined>(undefined);
  const [plannedBefore, setPlannedBefore] = useState<string | undefined>(undefined);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined);
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined);

  // Owner backend search
  const { employees: employeeOptions, search: searchEmployees, loading: loadingEmployees, error: employeeError } = useEmployeeSearch(accessToken);
  const lastOwnerSearchRef = useRef<string>("");

  const { 
    investments, 
    isLoading, 
    error, 
    totalCount,
    refetch 
  } = usePlannedExitsData({
    accessToken,
    searchTerm,
    sortBy: sortField,
    sortDirection: sortOrder.toLowerCase() as "asc" | "desc",
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    filters: {
      // map selectedFilters -> where as needed (DataContainer sends array of ids)
      // include directly; server understands these IDs inside our hook
      investmentGroupIds: selectedFilters.filter(f => f.startsWith('InvestmentGroup:')),
      ownerEmployeeIds: selectedFilters.filter(f => f.startsWith('Employee:')).map(id => id.replace('Employee:','')),
      // Column filters
      plannedExitDateFrom: plannedAfter,
      plannedExitDateTo: plannedBefore,
      createdAfter,
      createdBefore,
      investmentNameContains: investmentName.trim() || undefined,
      initialInvestmentMinAmount: initialRange?.min,
      initialInvestmentMaxAmount: initialRange?.max,
      investmentMarketValueMinAmount: marketRange?.min,
      investmentMarketValueMaxAmount: marketRange?.max,
      stakePercentageMin: stakeRange?.min,
      stakePercentageMax: stakeRange?.max,
    }
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // Sorting handler
  const handleSortingChange = useCallback((field: string) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // Toggle ASC -> DESC -> none(ASC default)
        setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
        return prevField;
      }
      setSortOrder('ASC');
      return field;
    });
    setCurrentPage(1);
  }, []);

  // Sortable header helper
  const SortableHead: React.FC<{ label: string; field: string }> = ({ label, field }) => {
    const isSorted = sortField === field;
    return (
      <TableHead className="gba:cursor-pointer" onClick={() => handleSortingChange(field)}>
        <div className="gba:flex gba:items-center gba:gap-1">
          {label}
          {isSorted && (sortOrder === 'ASC' ? (
            <ChevronUp className="gba:w-4 gba:h-4" />
          ) : (
            <ChevronDown className="gba:w-4 gba:h-4" />
          ))}
        </div>
      </TableHead>
    );
  };

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'divestments',
      fromSubView: 'planned-exits'
    });
    navigateTo(detailsUrl);
  }, []);

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'investment', label: 'Investment', visible: true },
    { id: 'group', label: 'Group', visible: true },
    { id: 'initialInvestment', label: 'Initial Investment', visible: true },
    { id: 'marketValue', label: 'Market Value', visible: true },
    { id: 'performance', label: 'Performance', visible: true },
    { id: 'stake', label: 'Stake %', visible: true },
    { id: 'plannedExitDate', label: 'Planned Exit Date', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    // Optional
    { id: 'created', label: 'Created', visible: false },
  ]);

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('PlannedExits: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('PlannedExits: Process completed successfully, refreshing planned exits data');
          refetch();
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || response?.investment) {
          console.log('PlannedExits: Investment data detected, refreshing planned exits list');
          refetch();
          return;
        }
        
        // Check for continue events with payload (investment updates)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('PlannedExits: Continue event with payload detected, refreshing data');
          refetch();
        }
      } catch (err) {
        console.error('Error handling process completion in PlannedExits:', err);
      }
    };

    // Listen to multiple possible event names for investment updates
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
  }, [refetch]);


  const visibleColumns = columnConfig.filter(c => c.visible).map(c => c.id);

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(c => c.id === columnId ? { ...c, visible } : c));
  }, []);

  // Map columns to filters so only visible ones appear
  const columnToFilterMap: Record<string, string> = {
    investment: 'investmentName',
    group: 'investmentGroup',
    initialInvestment: 'initialInvestmentRange',
    marketValue: 'marketValueRange',
    performance: 'performanceRange',
    stake: 'stakeRange',
    plannedExitDate: 'plannedExitDate',
    owner: 'owner',
    created: 'createdDate',
  };

  const filterGroupsAll = [
    // Investment name text filter
    {
      id: 'investmentName',
      title: 'Investment',
      filters: [],
      customComponent: React.createElement('input', {
        value: investmentName,
        onChange: (e: any) => setInvestmentName(e?.target?.value || ''),
        placeholder: 'Search investment name',
        className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none'
      }),
      hideSearch: true,
    },
    {
      id: 'investmentGroup',
      title: 'Investment Group',
      filters: [
        { id: 'InvestmentGroup:v1:REAL_ESTATE', label: 'Real Estate', selected: selectedFilters.includes('InvestmentGroup:v1:REAL_ESTATE') },
        { id: 'InvestmentGroup:v1:EQUITY', label: 'Equity', selected: selectedFilters.includes('InvestmentGroup:v1:EQUITY') },
        { id: 'InvestmentGroup:v1:LIQUID_FUND', label: 'Liquid Fund', selected: selectedFilters.includes('InvestmentGroup:v1:LIQUID_FUND') },
      ],
    },
    // Ranges matching numeric columns
    {
      id: 'initialInvestmentRange',
      title: 'Initial Investment',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: initialRange,
        onAmountRangeChange: setInitialRange,
        label: 'Initial Investment',
        dataTestIdPrefix: 'planned-exits-initial-range'
      }),
      hideSearch: true,
    },
    {
      id: 'marketValueRange',
      title: 'Market Value',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: marketRange,
        onAmountRangeChange: setMarketRange,
        label: 'Market Value',
        dataTestIdPrefix: 'planned-exits-market-range'
      }),
      hideSearch: true,
    },
    {
      id: 'performanceRange',
      title: 'Performance',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: performanceRange,
        onAmountRangeChange: setPerformanceRange,
        label: 'Performance %',
        dataTestIdPrefix: 'planned-exits-performance-range'
      }),
      hideSearch: true,
    },
    {
      id: 'stakeRange',
      title: 'Stake %',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: stakeRange,
        onAmountRangeChange: setStakeRange,
        label: 'Stake %',
        dataTestIdPrefix: 'planned-exits-stake-range'
      }),
      hideSearch: true,
    },
    {
      id: 'owner',
      title: 'Owner',
      filters: [],
      backendSearch: (term: string) => {
        const q = (term || '').trim();
        if (q !== lastOwnerSearchRef.current) {
          lastOwnerSearchRef.current = q;
          if (q.length >= 2) {
            void searchEmployees(q);
          }
        }
        const opts = (employeeOptions || []).map((e) => ({ id: `Employee:${e.id}`, label: e.displayName, value: e.id, selected: selectedFilters.includes(`Employee:${e.id}`) }));
        return { filters: q.length >= 2 ? opts : [], loading: loadingEmployees, error: employeeError || null } as any;
      },
    },
    {
      id: 'plannedExitDate',
      title: 'Planned Exit Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: plannedAfter,
        createdBefore: plannedBefore,
        onDateRangeChange: (after?: string, before?: string) => { setPlannedAfter(after); setPlannedBefore(before); }
      }),
      hideSearch: true,
    },
    {
      id: 'createdDate',
      title: 'Created',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: createdAfter,
        createdBefore: createdBefore,
        onDateRangeChange: (after?: string, before?: string) => { setCreatedAfter(after); setCreatedBefore(before); }
      }),
      hideSearch: true,
    }
  ];

  const visibleFilterGroups = filterGroupsAll.filter(g =>
    Object.values(columnToFilterMap).includes(g.id) ? visibleColumns.some(c => columnToFilterMap[c] === g.id) : true
  );

  if (isLoading && investments.length === 0) {
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
          <span>Error loading planned exits: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="planned-exits-container" className="gba:space-y-6">
      {/* Metrics Section */}
      <PlannedExitsMetrics context={{ accessToken, userInfo }} />

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
            'data-testid': 'planned-exits-column-visibility'
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Planned Exits</span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestment]}
              accessToken={accessToken}
              data-testid="planned-exits-add-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="planned-exits-add-action"
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
          filterGroups: visibleFilterGroups,
          onFilterChange: (id, checked) => {
            setSelectedFilters((prev) => checked ? [...prev, id] : prev.filter(f => f !== id));
          },
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('investment') && (<SortableHead label="Investment" field="name" />)}
                  {visibleColumns.includes('group') && (<SortableHead label="Group" field="investmentGroup.value" />)}
                  {visibleColumns.includes('initialInvestment') && (<SortableHead label="Initial Investment" field="initialInvestmentAmount" />)}
                  {visibleColumns.includes('marketValue') && (<SortableHead label="Market Value" field="investmentMarketValue" />)}
                  {visibleColumns.includes('performance') && (<TableHead>Performance</TableHead>)}
                  {visibleColumns.includes('stake') && (<SortableHead label="Stake %" field="stakePercentage" />)}
                  {visibleColumns.includes('plannedExitDate') && (<SortableHead label="Planned Exit Date" field="plannedExitDate" />)}
                  {visibleColumns.includes('owner') && (<SortableHead label="Owner" field="ownerEmployee.displayName" />)}
                  {visibleColumns.includes('created') && (<SortableHead label="Created" field="createdAt" />)}
                  {visibleColumns.includes('actions') && (<TableHead className="gba:w-[60px]">Actions</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => (
                  <TableRow key={investment.id} className="gba:cursor-pointer" onClick={() => handleRowClick(investment.id)}>
                    {visibleColumns.includes('investment') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{investment.name}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('group') && (<TableCell>
                      <Badge variant="outline">{investment.investmentGroup?.value || "Unknown"}</Badge>
                    </TableCell>)}
                    {visibleColumns.includes('initialInvestment') && (<TableCell>
                      <span>{formatCurrency(investment.initialInvestmentAmount || 0)}</span>
                    </TableCell>)}
                    {visibleColumns.includes('marketValue') && (<TableCell>
                      <span>{formatCurrency(investment.investmentMarketValue || 0)}</span>
                    </TableCell>)}
                    {visibleColumns.includes('performance') && (<TableCell>
                      {(() => {
                        const currentValue = investment.investmentMarketValue || 0;
                        const totalInvestmentValue = investment.totalInvestmentAmount || 0;
                        const performanceAmount = currentValue - totalInvestmentValue;
                        const performancePercentage = totalInvestmentValue > 0 ? (performanceAmount / totalInvestmentValue) * 100 : 0;
                        
                        return (
                          <div className="gba:flex gba:flex-col gba:items-start">
                            <span className={`gba:font-semibold ${
                              performancePercentage === 0 ? 'gba:text-gray-500' : 
                              performancePercentage > 0 ? 'gba:text-green-600' : 'gba:text-red-600'
                            }`}>
                              {formatCurrency(performanceAmount)}
                            </span>
                            <span className={`gba:text-sm ${
                              performancePercentage === 0 ? 'gba:text-gray-400' : 
                              performancePercentage > 0 ? 'gba:text-green-500' : 'gba:text-red-500'
                            }`}>
                              ({performancePercentage === 0 ? '' : performancePercentage > 0 ? '+' : ''}{performancePercentage.toFixed(2)}%)
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>)}
                    {visibleColumns.includes('stake') && (<TableCell>
                      <span className="gba:font-medium">
                        {investment.stakePercentage ? `${investment.stakePercentage.toFixed(1)}%` : "N/A"}
                      </span>
                    </TableCell>)}
                    {visibleColumns.includes('plannedExitDate') && (<TableCell>
                      {investment.plannedExitDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(investment.plannedExitDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>)}
                    {visibleColumns.includes('owner') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {investment.ownerEmployee?.displayName || 
                           investment.ownerEmployee?.firstName && investment.ownerEmployee?.lastName
                             ? `${investment.ownerEmployee.firstName} ${investment.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('created') && (
                      <TableCell>
                        <span>{formatDate((investment as any).createdAt)}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('actions') && (<TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`planned-exit-investment-update-button-${investment.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentEntity]}
                          externalContextData={{ investmentId: investment.id }}
                          prefixDataTestId={`planned-exit-investment-update`}
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
    </div>
  );
};

export default PlannedExits;
