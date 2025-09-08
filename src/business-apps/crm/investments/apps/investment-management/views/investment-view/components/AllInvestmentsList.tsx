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
import { PlusOutlined } from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, User } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "@/common/data/investment";


// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  // Handle specific cases for better display
  if (groupName === 'RealEstate') {
    return 'Real Estate';
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund';
  }
  
  // For other cases, add spaces before capital letters (camelCase to Title Case)
  return groupName.replace(/([A-Z])/g, ' $1').trim();
};

export interface AllInvestmentsListProps extends BusinessAppContextProps {}

const AllInvestmentsList: React.FC<AllInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField] = useState("createdAt");
  const [sortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const { fetchInvestments } = useGetInvestments(context);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryVariables: InvestmentQueryVariables = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    search: searchTerm.trim() || undefined,
    orderBy: [{ field: sortField, direction: sortOrder }],
    ...selectedFilters
  }), [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters]);

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

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
  }, [pageSize]);


  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'investments',
      fromSubView: 'overview'
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
              <span>All Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="all-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              variant="default"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="all-investments-add-button"
            >
              <PlusOutlined />
              Add Investment
            </Button>
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
                <TableHead>Type</TableHead>
                <TableHead>Initial Investment</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead>Performance</TableHead>
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
                    <Badge variant="outline">{formatGroupName(investment.investmentGroup?.value || "Unknown")}</Badge>
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
                        data-testid={`all-investment-update-button-${investment.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.investmentEntity]}
                        externalContextData={{ investmentId: investment.id }}
                        prefixDataTestId={`all-investment-update`}
                        accessToken={accessToken}
                        emptyStateBehavior="enable"
                        deferMainContextRequestsUntilClick={true}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
            data-testid="all-investments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="all-investments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount
              )} of ${totalCount} investments`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="all-investments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="all-investments-page-info"
              >
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid="all-investments-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="all-investments-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default AllInvestmentsList;


