import React, { useState, useEffect, useCallback } from "react";
import { 
  Card,
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
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  Award, 
  Building2, 
  Calendar, 
  User,
  Target
} from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import { useSalesData } from "./hooks/useSalesData";

interface SalesProps extends BusinessAppContextProps {}

const Sales: React.FC<SalesProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("closeDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const context = { accessToken, userInfo };

  const {
    soldOpportunities,
    metrics,
    total,
    loading,
    error,
    loadPage,
  } = useSalesData({
    search: searchTerm,
    sortField,
    sortOrder,
    context,
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
      fromSubView: 'sales'
    });
    navigateTo(detailsUrl);
  }, []);

  useEffect(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, searchTerm, sortField, sortOrder]);

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

  const renderMetrics = () => {
    if (!metrics) return null;

    const widgets: WidgetItem[] = [
      {
        key: "total-sold",
        title: getTranslationFromI18nKeyAndLabel("total_sold", "Total Sold"),
        value: metrics.totalSold,
        prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for sales success
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("successfully_sold_opportunities", "Successfully sold opportunities"),
        trend: {
          value: `${metrics.totalSold} ${getTranslationFromI18nKeyAndLabel("sold", "sold")}`,
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("completed_exits", "completed exits")
        }
      },
      {
        key: "average-sale-amount",
        title: getTranslationFromI18nKeyAndLabel("average_sale_amount", "Average Sale Amount"),
        value: formatCurrency(metrics.averageRevenue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for average sale amount
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_amount_per_sale", "Average amount per sale"),
        trend: {
          value: formatCurrency(metrics.averageRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_transaction", "per transaction")
        }
      },
      {
        key: "total-revenue",
        title: getTranslationFromI18nKeyAndLabel("total_revenue", "Total Revenue"),
        value: formatCurrency(metrics.totalRevenue),
        prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#389e0d', // Darker green for revenue
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("total_revenue_generated", "Total revenue generated from sales"),
        trend: {
          value: formatCurrency(metrics.totalRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("revenue_generated", "revenue generated")
        }
      },
      {
        key: "average-revenue",
        title: getTranslationFromI18nKeyAndLabel("average_revenue", "Average Revenue"),
        value: formatCurrency(metrics.averageRevenue),
        prefix: <Award className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme for averages
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_revenue_per_sale", "Average revenue per sale"),
        trend: {
          value: formatCurrency(metrics.averageRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_sale", "per sale")
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
        data-testid="sales-metrics"
      />
    );
  };

  // Helper function to get status badge variant (for sold opportunities)
  const getSalesBadgeVariant = (): "secondary" => {
    return "secondary"; // All sold opportunities use secondary (success) variant
  };

  const renderSalesTable = () => {
    if (loading && soldOpportunities.length === 0) {
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
            <span>Error loading sales: {error instanceof Error ? error.message : String(error)}</span>
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
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Sold Opportunities</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createOpportunity]}
              accessToken={accessToken}
              data-testid="sales-add-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="sales-add-action"
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
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Sale Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldOpportunities.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="gba:text-center gba:py-12">
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
                        <DollarSign className="gba:w-12 gba:h-12 gba:text-gray-400" />
                        <div className="gba:text-gray-600">
                          <p className="gba:font-medium gba:mb-1">
                            {getTranslationFromI18nKeyAndLabel("no_sales_found", "No sales found")}
                          </p>
                          <p className="gba:text-sm">
                            {getTranslationFromI18nKeyAndLabel(
                              "no_sold_opportunities_message", 
                              "No opportunities with 'WON' status found. Successfully closed divestment opportunities will appear here."
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  soldOpportunities.map((opportunity) => (
                    <TableRow 
                      key={opportunity.id} 
                      className="gba:cursor-pointer" 
                      onClick={() => handleRowClick(opportunity.id)}
                    >
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{opportunity.name}</span>
                          {opportunity.code && (
                            <span className="gba:text-sm gba:text-gray-500">{opportunity.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.investmentName || opportunity.account?.displayName || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="gba:font-medium gba:text-green-600">
                        {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSalesBadgeVariant()}>
                        Sold
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <DollarSign className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <span className="gba:font-medium gba:text-green-600">
                          {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {opportunity.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(opportunity.closeDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {opportunity.ownerEmployee?.displayName || 
                           opportunity.ownerEmployee?.firstName && opportunity.ownerEmployee?.lastName
                             ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`sold-opportunity-update-button-${opportunity.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentOpportunityEntity]}
                          externalContextData={{ opportunityId: opportunity.id }}
                          prefixDataTestId={`sold-opportunity-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
      />
    );
  };

  return (
    <div data-testid="sales-container" className="gba:space-y-6">
      {/* Metrics */}
      {renderMetrics()}

      {/* Sales List */}
      {renderSalesTable()}
    </div>
  );
};

export default Sales;
