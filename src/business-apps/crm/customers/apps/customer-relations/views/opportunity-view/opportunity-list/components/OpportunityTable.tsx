import React, { useCallback } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Button,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import { PiArrowUp, PiArrowDown } from "react-icons/pi";
import { Calendar, Building2 } from "lucide-react";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Opportunity } from "../types";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import {
  getWinningChanceBadgeVariant,
  getBadgeVariantFromCatalog,
} from "@/common/utils/badgeUtils";

export interface OpportunityTableProps {
  data: Opportunity[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
  total: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: "ASC" | "DESC" | "";
  onSelectOpportunity?: (opportunity: Opportunity) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedOpportunityId?: string;
  accessToken: string;
  sourceApp?: string;
  visibleColumns: string[];
}

const DATA_TEST_ID_PREFIX = "OpportunityTable";

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  data,
  loading,
  error,
  hasMore,
  loadMore,
  loadPage,
  retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectOpportunity,
  onPaginationChange,
  onSortingChange,
  selectedOpportunityId,
  accessToken,
  sourceApp,
  visibleColumns,
}) => {
  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: string) =>
    visibleColumns.includes(columnId);

  const formatCurrency = (
    amount: number | undefined,
    currency?: string
  ): string => {
    if (!amount) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // Align amount formatting with investments table
  const getCurrencySymbol = (currencyCode?: string): string => {
    try {
      const code = currencyCode || "EUR";
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(0);
      return parts.find((p) => p.type === "currency")?.value || code;
    } catch {
      return "€";
    }
  };

  const formatCurrencyNumberOnly = (
    amount: number | undefined,
    currencyCode?: string
  ): string => {
    if (!amount) return "0";
    try {
      const code = currencyCode || "EUR";
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).formatToParts(amount);
      return parts
        .filter((p) => p.type !== "currency")
        .map((p) => p.value)
        .join("");
    } catch {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };
  // Handle row click
  const handleRowClick = useCallback(
    (record: Opportunity) => {
      // Determine source based on sourceApp
      const source =
        sourceApp === "investment-relations" || sourceApp === "IRM"
          ? "investments"
          : "customer-relations";

      // Navigate to opportunity record page
      const url = buildPlatformUrl("/platform/crm/opportunity-record", {
        opportunityId: record.id,
        source: source,
      });
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectOpportunity?.(record);
    },
    [onSelectOpportunity, sourceApp]
  );

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === "ASC") {
        onSortingChange(field, "DESC");
      } else if (sortOrder === "DESC") {
        onSortingChange("", "");
      } else {
        onSortingChange(field, "ASC");
      }
    } else {
      onSortingChange(field, "ASC");
    }
  };

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === "ASC")
      return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === "DESC")
      return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  const getOwnerName = (record: Opportunity) => {
    if (record.ownerEmployee?.displayName) {
      return record.ownerEmployee.displayName;
    }
    if (record.ownerEmployee?.firstName && record.ownerEmployee?.lastName) {
      return `${record.ownerEmployee.firstName} ${record.ownerEmployee.lastName}`;
    }
    return "Unassigned";
  };

  const getStageColor = (
    alternativeCode?: string
  ):
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info" => {
    if (!alternativeCode) return "outline";
    switch (alternativeCode.toUpperCase()) {
      case "DISCOVERY":
        return "info";
      case "QUALIFICATION":
        return "warning";
      case "NEGOTIATION":
        return "secondary";
      case "CLOSED_WON":
        return "success";
      case "CLOSED_LOST":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {loading && (
          <div className="gba:flex gba:justify-center gba:p-4">
            <Spinner />
          </div>
        )}

        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {isColumnVisible("opportunity") && (
                  <TableHead
                    className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("name")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Opportunity
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("value") && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("estimatedAmount")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-value-header`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-center">
                      Amount
                      {renderSortIcon("estimatedAmount")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("winRate") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("winningChance")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Chance
                      {renderSortIcon("winningChance")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("pipeline") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("pipeline")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Pipeline
                      {renderSortIcon("pipeline")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("stage") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("stage")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-stage-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Stage
                      {renderSortIcon("stage")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("status") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("status")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Status
                      {renderSortIcon("status")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("closeDate") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("closeDate")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-close-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Close Date
                      {renderSortIcon("closeDate")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("account") && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("accountId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-account-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Account
                      {renderSortIcon("accountId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("owner") && (
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("ownerEmployeeId")}
                    data-testid={`${DATA_TEST_ID_PREFIX}-owner-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      Owner
                      {renderSortIcon("ownerEmployeeId")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("createdAt") && (
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="gba:flex gba:items-center">
                      Created {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
                {isColumnVisible("actions") && (
                  <TableHead
                    className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                  >
                    ACTIONS
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${
                    selectedOpportunityId === record.id ? "gba:bg-blue-50" : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                  onClick={() => handleRowClick(record)}
                >
                  {isColumnVisible("opportunity") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-cell-${record.id}`}
                    >
                      <div
                        className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(record);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-name-${record.id}`}
                      >
                        <div
                          className="gba:font-medium gba:text-sm gba:truncate"
                          title={record.name}
                        >
                          {record.name}
                        </div>
                        {record.account && !isColumnVisible("account") && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500">
                            <Building2
                              size={12}
                              className="gba:text-gray-400"
                            />
                            <span
                              className="gba:truncate"
                              title={record.account.name}
                            >
                              {record.account.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("value") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-value-cell-${record.id}`}
                    >
                      {record.estimatedAmount ? (
                        <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
                          <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">
                            {formatCurrencyNumberOnly(
                              record.estimatedAmount,
                              record.currency?.code
                            )}
                          </span>
                          <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
                            {getCurrencySymbol(record.currency?.code)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("winRate") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-cell-${record.id}`}
                    >
                      <Badge
                        variant={getWinningChanceBadgeVariant(
                          record.winningChance
                        )}
                      >
                        {record.winningChance
                          ? `${record.winningChance}%`
                          : "0%"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible("pipeline") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-cell-${record.id}`}
                    >
                      <div
                        className="gba:text-sm gba:truncate"
                        title={record.opportunityPipeline?.value}
                      >
                        {record.opportunityPipeline?.value ||
                          record.opportunityPipeline?.code ||
                          "-"}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("stage") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-stage-cell-${record.id}`}
                    >
                      {record.opportunityPipelineStage ? (
                        <Badge
                          variant={getStageColor(
                            record.opportunityPipelineStage?.alternativeCode
                          )}
                        >
                          {record.opportunityPipelineStage?.value ||
                            record.opportunityPipelineStage?.code ||
                            "-"}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("status") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                    >
                      {record.opportunityStatus ? (
                        <Badge
                          variant={getBadgeVariantFromCatalog(
                            record.opportunityStatus
                          )}
                        >
                          {record.opportunityStatus?.value ||
                            record.opportunityStatus?.code ||
                            "-"}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("closeDate") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-close-date-cell-${record.id}`}
                    >
                      {record.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {formatDate(record.closeDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("account") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-account-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                        <span
                          className="gba:text-sm gba:truncate"
                          title={record.account?.name}
                        >
                          {record.account?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible("owner") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${record.id}`}
                    >
                      {record.ownerEmployee ? (
                        <div
                          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
                          onClick={(e) => {
                            e.stopPropagation();
                            const empId = record.ownerEmployee?.id;
                            if (empId) {
                              navigateTo(`/platform/employee-record?employeeId=${empId}`);
                            }
                          }}
                        >
                          <Avatar size="sm" className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full">
                            {record.ownerEmployee?.pictureThumbnail && (
                              <AvatarImage
                                src={`data:image/gif;base64,${record.ownerEmployee.pictureThumbnail}`}
                                alt={getOwnerName(record)}
                                className="gba:object-cover gba:object-center"
                              />
                            )}
                            <AvatarFallback>
                              {getOwnerName(record) !== "-"
                                ? getOwnerName(record)
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="gba:flex gba:flex-col">
                            <span className="gba:font-medium gba:text-sm">
                              {getOwnerName(record)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("createdAt") && (
                    <TableCell className="gba:py-4 gba:px-6">
                      {record.createdAt ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {formatDate(record.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("actions") && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-opportunity-button-${record.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.updateOpportunity]}
                          externalContextData={{
                            opportunityId: record.id,
                          }}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-opportunity`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4">
        <div className="gba:text-sm gba:text-muted-foreground">
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(
            currentPage * pageSize,
            total
          )} of ${total} opportunities`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
            Page {currentPage} of {Math.ceil(total / pageSize)}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              <span className="gba:sr-only">Go to last page</span>
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OpportunityTable;
