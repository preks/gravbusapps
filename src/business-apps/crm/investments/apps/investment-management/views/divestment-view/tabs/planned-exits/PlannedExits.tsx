import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@newwork/nw-design-system";
import { Button, Input } from "@newwork/nw-design-system";
import { Spin, Alert, Badge } from "antd";
import {
  Search,
  Filter,
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
} from "lucide-react";
import { PiArrowUp, PiArrowDown } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DebouncedInput } from "@/components/data-filter";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import PlannedExitsMetrics from "./components/PlannedExitsMetrics";
import { usePlannedExitsData } from "./hooks/usePlannedExitsData";

interface PlannedExitsProps extends BusinessAppContextProps {}

const PlannedExits: React.FC<PlannedExitsProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const { 
    investments, 
    isLoading, 
    error, 
    totalCount,
    refetch 
  } = usePlannedExitsData({
    accessToken,
    searchTerm,
    sortBy: sortConfig?.key,
    sortDirection: sortConfig?.direction,
  });

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return null;
    return sortConfig.direction === "asc" ? (
      <PiArrowUp className="gba:ml-1 gba:h-4 gba:w-4" />
    ) : (
      <PiArrowDown className="gba:ml-1 gba:h-4 gba:w-4" />
    );
  };

  if (error) {
    return (
      <div data-testid="planned-exits-error" className="gba:p-6">
        <Alert
          message={getTranslationFromI18nKeyAndLabel("error", "Error")}
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div data-testid="planned-exits-container" className="gba:space-y-6">
      {/* Metrics Section */}
      <PlannedExitsMetrics accessToken={accessToken} />

      {/* Search and Filters */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:relative gba:w-80">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel(
                "search_investments",
                "Search investments..."
              )}
              value={searchTerm}
              onChange={setSearchTerm}
              className="gba:w-full gba:pl-10 gba:pr-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-blue-500"
              data-testid="planned-exits-search"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            data-testid="planned-exits-refresh"
          >
            {getTranslationFromI18nKeyAndLabel("refresh", "Refresh")}
          </Button>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-gray-600" data-testid="planned-exits-count">
            {getTranslationFromI18nKeyAndLabel("total_results", "Total")}: {totalCount}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="gba:border gba:rounded-lg gba:overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="gba:cursor-pointer gba:select-none"
                onClick={() => handleSort("name")}
                data-testid="header-name"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel("investment_name", "Investment Name")}
                  <SortIcon column="name" />
                </div>
              </TableHead>
              <TableHead
                className="gba:cursor-pointer gba:select-none"
                onClick={() => handleSort("investmentGroup.code")}
                data-testid="header-group"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel("group", "Group")}
                  <SortIcon column="investmentGroup.code" />
                </div>
              </TableHead>
              <TableHead
                className="gba:cursor-pointer gba:select-none"
                onClick={() => handleSort("investmentMarketValue")}
                data-testid="header-market-value"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel("market_value", "Market Value")}
                  <SortIcon column="investmentMarketValue" />
                </div>
              </TableHead>
              <TableHead
                className="gba:cursor-pointer gba:select-none"
                onClick={() => handleSort("stakePercentage")}
                data-testid="header-stake"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel("stake_percent", "Stake %")}
                  <SortIcon column="stakePercentage" />
                </div>
              </TableHead>
              <TableHead
                className="gba:cursor-pointer gba:select-none"
                onClick={() => handleSort("plannedExitDate")}
                data-testid="header-exit-date"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel("planned_exit_date", "Planned Exit Date")}
                  <SortIcon column="plannedExitDate" />
                </div>
              </TableHead>
              <TableHead data-testid="header-actions">
                {getTranslationFromI18nKeyAndLabel("actions", "Actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="gba:text-center gba:py-8">
                  <Spin size="large" />
                </TableCell>
              </TableRow>
            ) : investments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="gba:text-center gba:py-8">
                  <div className="gba:text-gray-500">
                    {getTranslationFromI18nKeyAndLabel(
                      "no_planned_exits",
                      "No investments planned for exit found"
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              investments.map((investment) => (
                <TableRow key={investment.id} data-testid={`investment-row-${investment.id}`}>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                      <span className="gba:font-medium">{investment.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {investment.investmentGroup ? (
                      <Badge color="blue">{investment.investmentGroup.code}</Badge>
                    ) : (
                      <span className="gba:text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <DollarSign className="gba:h-4 gba:w-4 gba:text-green-600" />
                      <span className="gba:font-medium">
                        {formatCurrency(investment.investmentMarketValue || 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="gba:font-medium">
                      {investment.stakePercentage?.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {investment.plannedExitDate ? (
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                        <span>{formatDate(investment.plannedExitDate)}</span>
                      </div>
                    ) : (
                      <span className="gba:text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`view-investment-${investment.id}`}
                    >
                      {getTranslationFromI18nKeyAndLabel("view_details", "View Details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PlannedExits;
