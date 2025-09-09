import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, Percent, TrendingUp, User } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "@/common/data/investment";


export interface EquityInvestmentsListProps extends BusinessAppContextProps {}

const EquityInvestmentsList: React.FC<EquityInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField] = useState("createdAt");
  const [sortOrder] = useState<"ASC_NULLS_LAST" | "DESC_NULLS_LAST">("DESC_NULLS_LAST");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const { fetchInvestments } = useGetInvestments(context);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...selectedFilters
    };
    // Filter by Equity investment group to match Overview tab behavior
    v.investmentGroupIds = ["InvestmentGroup:v1:EQUITY"];
    return v;
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchInvestments(queryVariables);
      setInvestments(result.Investment || []);
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestments, queryVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('EquityInvestmentsList: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('EquityInvestmentsList: Process completed successfully, refreshing equity data');
          loadData();
          return;
        }
        
        // Check for different event structures - specifically for equity investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.equityInvestment) {
          console.log('EquityInvestmentsList: Equity investment data detected, refreshing list');
          loadData();
          return;
        }
        
        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('EquityInvestmentsList: Continue event with payload detected, refreshing data');
          loadData();
        }
      } catch (err) {
        console.error('Error handling process completion in EquityInvestmentsList:', err);
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
  }, [loadData]);

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
      fromView: 'investments',
      fromSubView: 'equity'
    });
    navigateTo(detailsUrl);
  }, []);

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
          <span>Error loading investments: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
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
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>Equity Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="equity-investments-add-action"
            emptyStateBehavior="hide"
          >
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
              data-testid="equity-investments-add-action"
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
                <TableHead>Type</TableHead>
                <TableHead>Initial Investment</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Stake Type</TableHead>
                <TableHead>Stake %</TableHead>
                <TableHead>Acquisition Date</TableHead>
                <TableHead>Planned Exit</TableHead>
                <TableHead>EBITDA</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
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
                    <Badge variant="secondary">{investment.investmentType?.value || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span>{formatCurrency(investment.initialInvestmentAmount || 0)}</span>
                  </TableCell>
                  <TableCell>
                    <span>{formatCurrency(investment.investmentMarketValue || 0)}</span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const currentValue = investment.investmentMarketValue || 0;
                      const initialValue = investment.initialInvestmentAmount || 0;
                      const performanceAmount = currentValue - initialValue;
                      const performancePercentage = initialValue > 0 ? (performanceAmount / initialValue) * 100 : 0;
                      
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
                    <Badge variant="outline">
                      {investment.investmentStakeType?.value || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Percent className="gba:w-4 gba:h-4 gba:text-blue-600" />
                      <span>{investment.stakePercentage ? `${investment.stakePercentage}%` : "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                      <span>{investment.acquisitionDate ? formatDate(investment.acquisitionDate) : "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:w-4 gba:h-4 gba:text-orange-500" />
                      <span>{investment.plannedExitDate ? formatDate(investment.plannedExitDate) : "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <TrendingUp className="gba:w-4 gba:h-4 gba:text-purple-600" />
                      <span>
N/A
                      </span>
                    </div>
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
                  <TableCell>
                    <Badge variant={investment.investmentStatus?.code === "ACTIVE" ? "default" : "secondary"}>
                      {investment.investmentStatus?.value || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                      <span>{formatDate(investment.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`equity-investment-update-button-${investment.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.investmentEntity]}
                        externalContextData={{ investmentId: investment.id }}
                        prefixDataTestId={`equity-investment-update`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick={true}
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
  );
};

export default EquityInvestmentsList;


