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
  PiEnvelope,
  PiPhone,
  PiBuilding,
  PiCalendar,
  PiArrowUp,
  PiArrowDown,
  PiUser,
} from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import {
  getAccountTypeBadgeVariant,
  getIndustryBadgeVariant,
} from "@/common/utils/badgeUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

// Account interface matching the GraphQL schema
interface EmployeeAccount {
  id: string;
  version?: number;
  name: string;
  website?: string;
  legalForm?: {
    value: string;
    code: string;
    id: string;
    objectValue?: any;
  };
  numberOfEmployees?: {
    value: string;
  };
  contact?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
  addresses?: {
    city: string;
    country: {
      id: string;
      value: string;
      code: string;
    };
    region: {
      id: string;
      value: string;
      code: string;
    };
  }[];
  foundationDate?: string;
  industry?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployee?: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const DATA_TEST_ID_PREFIX = "EmployeeAccountsTable";

interface AccountsTableProps {
  accounts: EmployeeAccount[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  retry: () => void;
  total: number;
  pageSize: number;
  currentPage: number;
  sortField: string;
  sortOrder: "ASC" | "DESC" | "";
  onSelectAccount?: (account: EmployeeAccount) => void;
  onPaginationChange: (page: number, pageSize?: number) => void;
  onSortingChange: (field: string, order: "ASC" | "DESC" | "") => void;
  selectedAccountId?: string;
  accessToken: string;
  employeeId?: string;
}

export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts = [],
  loading,
  error,
  hasMore,
  retry,
  total,
  pageSize,
  currentPage,
  sortField,
  sortOrder,
  onSelectAccount,
  onPaginationChange,
  onSortingChange,
  selectedAccountId,
  accessToken,
  employeeId,
}) => {
  const { t } = useTranslation();
  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === "ASC")
      return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === "DESC")
      return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  };

  // Handle sorting change
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === "ASC") {
        onSortingChange(field, "DESC");
      } else if (sortOrder === "DESC") {
        onSortingChange("", "DESC");
      } else {
        onSortingChange(field, "ASC");
      }
    } else {
      onSortingChange(field, "ASC");
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  // Handle row click
  const handleRowClick = useCallback(
    (record: EmployeeAccount) => {
      // Navigate to account record page
      const navigationParams: Record<string, string> = {
        accountId: record.id,
        source: "customer-relations",
        fromEntity: "salesPerformance",
      };

      // Add employee ID if available for proper back navigation
      if (employeeId) {
        navigationParams.employeeId = employeeId;
      }

      const url = buildPlatformUrl(
        "/platform/crm/account-record",
        navigationParams
      );
      navigateTo(url);

      // Also call the selection callback if provided
      onSelectAccount?.(record);
    },
    [onSelectAccount, employeeId]
  );

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
          {t("account.error.title", "Error Loading Accounts")}
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
                  data-testid={`${DATA_TEST_ID_PREFIX}-company-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("account.company", "Company")}
                    {renderSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[18%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-contact-header`}
                >
                  {t("account.contact", "Contact Info")}
                </TableHead>
                <TableHead
                  className="gba:w-[17%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("createdAt")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("account.created", "Creation Date")}
                    {renderSortIcon("createdAt")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[17%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("typeRef")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("account.type", "Type")}
                    {renderSortIcon("typeRef")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[23%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => handleSort("industryRef")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-industry-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {t("account.industry", "Industry")}
                    {renderSortIcon("industryRef")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts &&
                accounts.map((account: EmployeeAccount) => (
                  <TableRow
                    key={account.id}
                    className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${
                      selectedAccountId === account.id ? "gba:bg-blue-50" : ""
                    }`}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${account.id}`}
                  >
                    {/* Actions Column */}
                    <TableCell
                      className="gba:py-4 gba:px-4"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${account.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-account-button-${account.id}`}
                          variant="secondary"
                          contextsArray={[FlowContextName.accountEntity]}
                          externalContextData={{ accountId: account.id }}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-account`}
                          accessToken={accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>

                    {/* Company Column */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-company-cell-${account.id}`}
                    >
                      <div
                        className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(account);
                        }}
                        data-testid={`${DATA_TEST_ID_PREFIX}-account-name-${account.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-blue-100 gba:rounded-full">
                          <PiBuilding size={20} className="gba:text-blue-600" />
                        </div>
                        <div className="gba:flex gba:flex-col">
                          <span
                            className="gba:font-medium gba:text-sm"
                            title={account.name}
                          >
                            {account.name || "-"}
                          </span>
                          {account.website && (
                            <span
                              className="gba:text-xs gba:text-gray-500"
                              title={account.website}
                            >
                              {account.website}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Info Column */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-contact-cell-${account.id}`}
                    >
                      <div className="gba:space-y-1">
                        {account.contact?.[0] &&
                          (account.contact[0].firstName ||
                            account.contact[0].lastName) && (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <PiUser size={14} className="gba:text-gray-400" />
                              <span
                                className="gba:text-sm gba:font-medium gba:cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  const contactId = account.contact?.[0]?.id;

                                  if (!contactId) {
                                    return;
                                  }

                                  const navigationParams: Record<
                                    string,
                                    string
                                  > = {
                                    contactId: contactId,
                                    source: "customer-relations",
                                    fromEntity: "salesPerformance",
                                  };

                                  // Add employee ID if available for proper back navigation
                                  if (employeeId) {
                                    navigationParams.employeeId = employeeId;
                                  }

                                  const url = buildPlatformUrl(
                                    "/platform/crm/contact-record",
                                    navigationParams
                                  );
                                  navigateTo(url);
                                }}
                                title={`${account.contact[0].firstName || ""} ${
                                  account.contact[0].lastName || ""
                                }`.trim()}
                                data-testid={`${DATA_TEST_ID_PREFIX}-contact-name-${account.id}`}
                              >
                                {(account.contact[0].firstName || "") +
                                  (account.contact[0].lastName
                                    ? " " + account.contact[0].lastName
                                    : "")}
                              </span>
                            </div>
                          )}
                        {account.contact?.[0]?.email && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiEnvelope
                              size={14}
                              className="gba:text-gray-400"
                            />
                            <span
                              className="gba:text-sm"
                              title={account.contact[0].email}
                            >
                              {account.contact[0].email}
                            </span>
                          </div>
                        )}
                        {account.contact?.[0]?.phone && (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiPhone size={14} className="gba:text-gray-400" />
                            <span
                              className="gba:text-sm"
                              title={account.contact[0].phone}
                            >
                              {account.contact[0].phone}
                            </span>
                          </div>
                        )}
                        {!account.contact?.[0]?.email &&
                          !account.contact?.[0]?.phone &&
                          !(
                            account.contact?.[0]?.firstName ||
                            account.contact?.[0]?.lastName
                          ) && (
                            <span className="gba:text-sm gba:text-gray-500">
                              -
                            </span>
                          )}
                      </div>
                    </TableCell>

                    {/* Creation Date Column */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${account.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
                        <PiCalendar size={14} className="gba:text-gray-400" />
                        <span>{formatDate(account.createdAt)}</span>
                      </div>
                    </TableCell>

                    {/* Type Column */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${account.id}`}
                    >
                      <Badge
                        variant={getAccountTypeBadgeVariant(account.legalForm)}
                      >
                        {account.legalForm?.value || "-"}
                      </Badge>
                    </TableCell>

                    {/* Industry Column */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-industry-cell-${account.id}`}
                    >
                      <Badge
                        variant={getIndustryBadgeVariant(account.industry)}
                      >
                        {account.industry?.value || "-"}
                      </Badge>
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
            )} of ${total} accounts`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
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

export default AccountsTable;
