import React, { useState, useEffect, useCallback } from "react";
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
import {
  Building2,
  Calendar,
  User
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import PlannedExitsMetrics from "./components/PlannedExitsMetrics";
import { useGetInvestments, Investment } from "@/common/data/investment";

interface PlannedExitsProps extends BusinessAppContextProps {}

const PlannedExits: React.FC<PlannedExitsProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField] = useState("plannedExitDate");
  const [sortOrder] = useState<"ASC" | "DESC">("ASC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // State for investments data
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchInvestments } = useGetInvestments({ accessToken, userInfo });

  // Data fetching function using central resources
  const fetchPlannedExits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use central investment query to get ALL investments, then filter for planned exits
      // We need to get more than the page size to ensure we have enough planned exits
      const response = await fetchInvestments({
        search: searchTerm,
        limit: 1000, // Get a large batch to filter properly
        offset: 0,
        orderBy: [{
          field: sortField,
          direction: sortOrder === 'DESC' ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
        }]
      });

      // Filter for planned exits (not EXITED) - this is the correct filtering logic
      const plannedExits = response.Investment.filter(investment => 
        investment.planedExit === true && 
        investment.investmentStatus?.code !== 'EXITED'
      );

      // Apply pagination to filtered results
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedInvestments = plannedExits.slice(startIndex, endIndex);

      setInvestments(paginatedInvestments);
      setTotalCount(plannedExits.length);
    } catch (err) {
      console.error('Error fetching planned exits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch planned exits');
      setInvestments([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestments, searchTerm, sortField, sortOrder, currentPage, pageSize]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (accessToken) {
      fetchPlannedExits();
    }
  }, [accessToken, fetchPlannedExits]);

  const refetch = useCallback(() => {
    fetchPlannedExits();
  }, [fetchPlannedExits]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'divestments',
      fromSubView: 'planned-exits'
    });
    navigateTo(detailsUrl);
  }, []);

  // Listen for process completion events to refresh data
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
          <span>Error loading planned exits: {typeof error === 'string' ? error : 'Unknown error'}</span>
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
          filterGroups: [],
          onFilterChange: () => {},
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investment</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Total Investment</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Stake %</TableHead>
                  <TableHead>Planned Exit Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => (
                  <TableRow key={investment.id} className="gba:cursor-pointer" onClick={() => handleRowClick(investment.id)}>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{investment.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{investment.investmentGroup?.value || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(investment.totalInvestmentAmount || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(investment.investmentMarketValue || 0)}</span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <span className="gba:font-medium">
                        {investment.stakePercentage ? `${investment.stakePercentage.toFixed(1)}%` : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {investment.plannedExitDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(investment.plannedExitDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {investment.ownerEmployee?.displayName || 
                           investment.ownerEmployee?.firstName && investment.ownerEmployee?.lastName
                             ? `${investment.ownerEmployee.firstName} ${investment.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>
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
