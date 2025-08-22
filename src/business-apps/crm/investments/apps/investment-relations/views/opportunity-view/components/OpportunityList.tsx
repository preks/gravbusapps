import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Button,
  Badge,
  Spinner,
  Alert,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from "@newwork/nw-design-system";
import { 
  Target,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentOpportunities } from "@/common/data/investment/hooks/useInvestmentOpportunities";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import type { InvestmentOpportunityQueryVariables } from "@/common/data/investment/queries/investmentOpportunityQueries";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatCurrency, formatDate } from "../utils";
import { navigateTo } from "@/common/utils/navigationUtils";

export interface OpportunityListProps extends BusinessAppContextProps {}

export const OpportunityList: React.FC<OpportunityListProps> = (context) => {
  const { accessToken } = context;
  
  // State management
  const [searchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters] = useState<Record<string, any>>({});

  // Hooks for data fetching
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);

  // Data state
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query variables
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    search: searchTerm.trim() || undefined,
    orderBy: [{ field: sortField, direction: sortOrder }],
    ...selectedFilters
  }), [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters]);

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

  // Removed redundant search (handled by DataContainer)

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



  // Removed unused clearFilters (filters handled by parent views)

  // Handle row click to navigate to opportunity record
  const handleRowClick = useCallback((opportunityId: string) => {
    navigateTo(`/platform/irm/opportunity-record?opportunityId=${opportunityId}`);
  }, []);

  // Helper function to get owner display name
  const getOwnerName = (opportunity: InvestmentOpportunity) => {
    if (opportunity.ownerEmployee?.displayName) {
      return opportunity.ownerEmployee.displayName;
    }
    if (opportunity.ownerEmployee?.firstName || opportunity.ownerEmployee?.lastName) {
      return `${opportunity.ownerEmployee.firstName || ""} ${opportunity.ownerEmployee.lastName || ""}`.trim();
    }
    return "-";
  };

  // Helper function to calculate win rate based on status
  const getWinRate = (opportunity: InvestmentOpportunity) => {
    if (!opportunity.opportunityStatus?.code) return "-";
    
    const status = opportunity.opportunityStatus.code.toLowerCase();
    if (status.includes('won') || status.includes('closed_won')) return "100%";
    if (status.includes('high_probability') || status.includes('likely_to_win')) return "80%";
    if (status.includes('medium_probability')) return "50%";
    if (status.includes('low_probability')) return "20%";
    if (status.includes('lost') || status.includes('closed_lost')) return "0%";
    
    return "50%"; // Default
  };

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
    <div data-testid="investment-opportunities-list">
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("name")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Opportunity
                    {sortField === "name" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("estimatedAmount")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Amount
                    {sortField === "estimatedAmount" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("opportunityStatus")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Win Rate
                    {sortField === "opportunityStatus" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("opportunityPipeline")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Pipeline
                    {sortField === "opportunityPipeline" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("closeDate")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Close Date
                    {sortField === "closeDate" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("accountId")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Account
                    {sortField === "accountId" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("ownerEmployeeId")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Owner
                    {sortField === "ownerEmployeeId" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Created
                    {sortField === "createdAt" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="gba:text-center gba:py-8">
                    <div className="gba:text-gray-500">
                      {searchTerm ? "No opportunities found matching your search criteria." : "No opportunities available."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                opportunities.map((opportunity) => (
                  <TableRow 
                    key={opportunity.id} 
                    data-testid={`investment-opportunity-row-${opportunity.id}`}
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                    onClick={() => handleRowClick(opportunity.id)}
                  >
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:h-4 gba:w-4 gba:text-gray-400" />
                        <div>
                          <div className="gba:font-medium">{opportunity.name}</div>
                          {opportunity.code && (
                            <div className="gba:text-sm gba:text-gray-500">Code: {opportunity.code}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                      <TableCell>
                        {opportunity.estimatedAmount ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">{formatCurrency(opportunity.estimatedAmount)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">{getWinRate(opportunity)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {opportunity.opportunityPipeline ? (
                          <Badge variant="secondary" data-testid={`investment-opportunity-pipeline-${opportunity.id}`}>
                            {opportunity.opportunityPipeline.code}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opportunity.closeDate ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">{formatDate(opportunity.closeDate)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opportunity.account ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">{opportunity.account.name}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opportunity.ownerEmployee ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Avatar size="sm">
                              {opportunity.ownerEmployee.picture && (
                                <AvatarImage
                                  src={opportunity.ownerEmployee.picture}
                                  alt={getOwnerName(opportunity)}
                                />
                              )}
                              <AvatarFallback>
                                {getOwnerName(opportunity) !== "-"
                                  ? getOwnerName(opportunity)
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "O"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">{getOwnerName(opportunity)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {opportunity.createdAt ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">{formatDate(opportunity.createdAt)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`opportunity-entity-button-${opportunity.id}`}
                            size="icon"
                            contextsArray={[FlowContextName.investmentOpportunityEntity]}
                            externalContextData={{ opportunityId: opportunity.id }}
                            prefixDataTestId={`opportunity-entity-update`}
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick={true}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                     </TableRow>
                 ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} opportunities
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              data-testid="investment-opportunities-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => handlePageChange(currentPage + 1)}
              data-testid="investment-opportunities-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
