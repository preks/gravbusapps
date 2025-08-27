import React, { useCallback, useEffect, useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Button, Alert } from "@newwork/nw-design-system";
import { Spinner } from "@newwork/nw-design-system";
import LiquidPortfolioMetricsCards from "./LiquidPortfolioMetricsCards";
import LiquidPortfolioTable from "./LiquidPortfolioTable";
import { useLiquidPortfolioDataIntegration } from "../hooks/useLiquidPortfolioDataIntegration";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

export interface LiquidPortfolioTabProps extends BusinessAppContextProps {}

const LiquidPortfolioTab: React.FC<LiquidPortfolioTabProps> = (context) => {
  const { accessToken } = context;

  // Local state for server-driven search/sort/pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC" | "">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { portfolios, isLoading, error, refetch, totalCount } =
    useLiquidPortfolioDataIntegration(context, {
      searchTerm: debouncedSearchTerm,
      sortBy: sortField || undefined,
      sortOrder: (sortOrder as "ASC" | "DESC") || undefined,
      currentPage,
      pageSize,
    });

  // Sorting handler for table
  const handleSortChange = useCallback(
    (field: string, order: "ASC" | "DESC" | "") => {
      setSortField(field);
      setSortOrder(order);
    },
    []
  );

  // Pagination handler
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      setCurrentPage(page);
      if (newPageSize && newPageSize !== pageSize) {
        setPageSize(newPageSize);
        setCurrentPage(1);
      }
    },
    [pageSize]
  );

  const handleRowClick = useCallback((portfolioId: string) => {
    const detailsUrl = buildPlatformUrl("/platform/irm/liquid-portfolio-record", {
      portfolioId,
    });
    navigateTo(detailsUrl);
  }, []);

  if (isLoading && portfolios.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="liquid-portfolio-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="liquid-portfolio-error">
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch} data-testid="liquid-portfolio-retry-button">
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="liquid-portfolio-tab">
      <div data-testid="liquid-portfolio-metrics-wrapper">
        <LiquidPortfolioMetricsCards
          portfolios={portfolios}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={refetch}
          data-testid="liquid-portfolio-metrics"
        />
      </div>

      <div className="gba:flex gba:lg:flex-row gba:lg:items-center gba:justify-between gba:gap-4 gba:mb-2" data-testid="liquid-portfolio-controls">
        <input
          className="gba:[&&]:pl-3 gba:pr-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-lg gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-transparent"
          placeholder="Search portfolios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="liquid-portfolio-search-input"
        />
        <div className="gba:text-gray-600" data-testid="liquid-portfolio-total-count">
          {totalCount} items
        </div>
      </div>

      <LiquidPortfolioTable
        portfolios={portfolios}
        onRowClick={handleRowClick}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        currentPage={currentPage}
        pageSize={pageSize}
        total={totalCount}
        onPaginationChange={handlePaginationChange}
        accessToken={accessToken!}
        data-testid="liquid-portfolio-table"
      />
    </div>
  );
};

export default LiquidPortfolioTab;


