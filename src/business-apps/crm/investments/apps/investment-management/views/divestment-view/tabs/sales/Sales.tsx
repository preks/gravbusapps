import React, { useState, useEffect } from "react";
import { Card } from "@newwork/nw-design-system";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { TrendingUp, DollarSign, CheckCircle, Search, Award } from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DebouncedInput } from "@/components/data-filter";
import { useSalesData } from "./hooks/useSalesData";
import { OpportunityList } from "@/business-apps/crm/customers/apps/customer-relations/views/opportunity-view/opportunity-list";

interface SalesProps extends BusinessAppContextProps {}

const Sales: React.FC<SalesProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("closeDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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
      },
      {
        key: "success-rate",
        title: getTranslationFromI18nKeyAndLabel("success_rate", "Success Rate"),
        value: `${metrics.averageWinRate.toFixed(1)}%`,
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-gold-600" />,
        color: '#faad14', // Gold theme for success rate
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("overall_success_rate", "Overall success rate"),
        trend: {
          value: `${metrics.averageWinRate.toFixed(1)}% ${getTranslationFromI18nKeyAndLabel("success_rate", "success rate")}`,
          positive: metrics.averageWinRate > 50,
          description: getTranslationFromI18nKeyAndLabel("win_rate", "win rate")
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

  const formatCurrency = (amount: number, currencyCode: string = "USD"): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSalesList = () => (
    <OpportunityList accessToken={accessToken} userInfo={userInfo} sourceApp="divestments" />
  );

  return (
    <div data-testid="sales-container" className="gba:space-y-6">
      {/* Header Section */}
      <div className="gba:border-b gba:border-gray-200 gba:pb-6">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
          <CheckCircle className="gba:h-6 gba:w-6 gba:text-green-600" />
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel("sales", "Sales")}
          </h2>
        </div>
        <p className="gba:text-sm gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            "sales_description", 
            "Successfully sold opportunities from investments planned for exit (WON status displayed as 'Sold')"
          )}
        </p>
      </div>

      {/* Sales Success Banner */}
      <Card className="gba:p-6 gba:bg-gradient-to-r gba:from-green-50 gba:to-emerald-50 gba:border-green-200">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:p-3 gba:bg-green-100 gba:rounded-full">
            <TrendingUp className="gba:h-8 gba:w-8 gba:text-green-600" />
          </div>
          <div className="gba:flex-1">
            <h3 className="gba:text-lg gba:font-semibold gba:text-green-900 gba:mb-1">
              {getTranslationFromI18nKeyAndLabel("successful_exits", "Successful Exits")}
            </h3>
            <p className="gba:text-green-700">
              {getTranslationFromI18nKeyAndLabel(
                "successful_exits_desc",
                "Track completed divestment sales and their performance metrics"
              )}
            </p>
          </div>
          <div className="gba:text-right">
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-green-600">
              <DollarSign className="gba:h-5 gba:w-5" />
              <span className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel("revenue_generated", "Revenue Generated")}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      {renderMetrics()}

      {/* Sales List */}
      <div className="gba:bg-white gba:rounded-lg gba:shadow-sm gba:p-6">
        <div className="gba:mb-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel("sold_opportunities", "Sold Opportunities")}
            </h3>
            <div className="gba:relative gba:w-80">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
              <DebouncedInput
                placeholder={getTranslationFromI18nKeyAndLabel(
                  "search_sales",
                  "Search sold opportunities..."
                )}
                value={searchTerm}
                onChange={setSearchTerm}
                className="gba:w-full gba:pl-10 gba:pr-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:ring-2 gba:focus:ring-green-500 gba:focus:border-green-500"
                data-testid="sales-search"
              />
            </div>
          </div>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              "sold_opportunities_desc",
              "All opportunities that have been successfully sold (WON status displayed as 'Sold')"
            )}
          </p>
        </div>
        {renderSalesList()}
      </div>
    </div>
  );
};

export default Sales;
