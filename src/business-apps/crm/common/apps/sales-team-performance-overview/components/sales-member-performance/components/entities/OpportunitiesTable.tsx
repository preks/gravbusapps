import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Spinner,
  Button,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import {
  PiFunnel,
  PiCalendar,
  PiBuilding,
  PiArrowUp,
  PiArrowDown,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Opportunity } from "../../../../../../components/opportunity-list/types";
import {
  getWinningChanceBadgeVariant,
  getSalesPipelineStageBadgeVariant,
} from "@/common/utils/badgeUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

const DATA_TEST_ID_PREFIX = "EmployeeOpportunitiesTable";

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  retry: () => void;
  total: number;
  pageSize: number;
  currentPage: number;
  sortField: string;
  sortOrder: "ASC" | "DESC" | "";
  onSelectOpportunity?: (opportunity: Opportunity) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedOpportunityId?: string;
  accessToken: string;
  employeeId?: string;
}

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  loading,
  error,
  hasMore,
  retry,
  total,
  pageSize,
  currentPage,
  sortField,
  sortOrder,
  onSelectOpportunity,
  onPaginationChange,
  onSortingChange,
  selectedOpportunityId,
  accessToken,
  employeeId,
}) => {
  const { t } = useTranslation();

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

  // Handle row click
  const handleRowClick = useCallback(
    (record: Opportunity) => {
      // Navigate to opportunity record page
      const navigationParams: Record<string, string> = {
        opportunityId: record.id,
        source: "customer-relations",
        fromEntity: "salesPerformance",
      };

      // Add employee ID if available for proper back navigation
      if (employeeId) {
        navigationParams.employeeId = employeeId;
      }

      const url = buildPlatformUrl(
        "/platform/crm/opportunity-record",
        navigationParams
      );
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectOpportunity?.(record);
    },
    [onSelectOpportunity, employeeId]
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

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t("opportunity.error.title", "Error Loading Opportunities")}
        </div>
        <div className="gba:text-gray-600 gba:mb-4">{error.message}</div>
        <Button
          variant="default"
          onClick={retry}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {t("common.retry", "Retry")}
        </Button>
      </div>
    );
  }

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
                <TableHead
                  className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-4"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  ACTIONS
                </TableHead>
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
                <TableHead
                  className="gba:w-[16%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("estimatedAmount")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-value-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Value
                    {renderSortIcon("estimatedAmount")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[14%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("winningChance")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Win Rate
                    {renderSortIcon("winningChance")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[14%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("stage")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-stage-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Stage
                    {renderSortIcon("stage")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[16%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-header`}
                >
                  Pipeline
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("closeDate")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-close-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    Close Date
                    {renderSortIcon("closeDate")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow
                  key={opportunity.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                    selectedOpportunityId === opportunity.id
                      ? "gba:bg-blue-50"
                      : ""
                  }`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${opportunity.id}`}
                >
                  {/* Actions Column */}
                  <TableCell
                    className="gba:py-4 gba:px-4"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${opportunity.id}`}
                  >
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`${DATA_TEST_ID_PREFIX}-update-opportunity-button-${opportunity.id}`}
                        variant="secondary"
                        contextsArray={[FlowContextName.opportunityEntity]}
                        externalContextData={{
                          opportunityId: opportunity.id,
                        }}
                        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-opportunity`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>

                  {/* Opportunity Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-cell-${opportunity.id}`}
                  >
                    <div
                      className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(opportunity);
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-opportunity-name-${opportunity.id}`}
                    >
                      <div
                        className="gba:font-medium gba:text-sm gba:truncate"
                        title={opportunity.name}
                      >
                        {opportunity.name}
                      </div>
                      {opportunity.account && (
                        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-500">
                          <PiBuilding size={12} />
                          <span
                            className="gba:truncate"
                            title={opportunity.account.name}
                          >
                            {opportunity.account.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Value Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-value-cell-${opportunity.id}`}
                  >
                    <div className="gba:text-sm gba:font-medium">
                      {formatCurrency(
                        opportunity.estimatedAmount,
                        opportunity.currency?.code
                      )}
                    </div>
                  </TableCell>

                  {/* Win Rate Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-win-rate-cell-${opportunity.id}`}
                  >
                    <Badge
                      variant={getWinningChanceBadgeVariant(
                        opportunity.winningChance
                      )}
                    >
                      {opportunity.winningChance
                        ? `${opportunity.winningChance}%`
                        : "0%"}
                    </Badge>
                  </TableCell>

                  {/* Stage Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-stage-cell-${opportunity.id}`}
                  >
                    <Badge
                      variant={getSalesPipelineStageBadgeVariant(
                        opportunity.salesPipelineStage
                      )}
                    >
                      {opportunity.salesPipelineStage?.value || "Unknown Stage"}
                    </Badge>
                  </TableCell>

                  {/* Pipeline Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-cell-${opportunity.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
                      <PiFunnel size={14} className="gba:text-gray-400" />
                      <span
                        className="gba:truncate"
                        title={opportunity.salesPipeline?.value}
                      >
                        {opportunity.salesPipeline?.value || "-"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Close Date Column */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-close-date-cell-${opportunity.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
                      <PiCalendar size={14} className="gba:text-gray-400" />
                      <span>{formatDate(opportunity.closeDate)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
        >
          <div
            className="gba:text-sm gba:text-muted-foreground"
            data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
          >
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(
              currentPage * pageSize,
              total
            )} of ${total} opportunities`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-3 gba:lg:space-x-4">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">Rows per page</p>
              <select
                value={pageSize}
                onChange={(e) => onPaginationChange(1, Number(e.target.value))}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div
              className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
              data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
            >
              Page {currentPage} of {Math.ceil(total / pageSize)}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
              >
                <span className="gba:sr-only">Go to first page</span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
              >
                <span className="gba:sr-only">Go to previous page</span>⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
              >
                <span className="gba:sr-only">Go to next page</span>⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
              >
                <span className="gba:sr-only">Go to last page</span>
                ⟩⟩
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunitiesTable;
