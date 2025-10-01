import React, { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@newwork/nw-design-system";
import { Building2, Mail, Phone, Globe, Calendar, MapPin } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import type { InvestmentAccount } from "@/common/data/investment/types";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatDate } from "../utils";
import { formatAddress } from "@/common/utils/addressFormatter";
import { formatCurrencyParts } from '@/common/utils/numberFormatter';
import { navigateTo } from "@/common/utils/navigationUtils";
import type { SortInput } from "@/common/network/graphql/queryHelpers";

export interface AccountListProps extends BusinessAppContextProps {
  accounts: InvestmentAccount[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: SortInput["direction"];
  onClearFilters?: () => void;
  visibleColumns?: string[];
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  searchTerm,
  onSearchChange,
  isLoading = false,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  onClearFilters,
  visibleColumns = ["actions", "account", "contact", "location", "industry", "legalForm", "owner", "created"],
  ...context
}) => {
  const handleRowClick = useCallback((accountId: string) => {
    navigateTo(`/platform/irm/account-record?accountId=${accountId}`);
  }, []);

  const getSortIcon = (field: string) => {
    if (sortField !== field || !sortOrder) return null;
    return String(sortOrder).startsWith("ASC") ? "↑" : "↓";
  };

  // Helper function to get owner display name
  const getOwnerName = (account: InvestmentAccount) => {
    if (account.ownerEmployee?.displayName) {
      return account.ownerEmployee.displayName;
    }
    if (account.ownerEmployee?.firstName || account.ownerEmployee?.lastName) {
      return `${account.ownerEmployee.firstName || ""} ${
        account.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  // Helper function to get contact info
  const getContactInfo = (account: InvestmentAccount) => {
    const contactInfo = [];

    if (account.email) {
      contactInfo.push(
        <div
          key="email"
          className="gba:flex gba:items-center gba:gap-2 gba:mb-1"
        >
          <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{account.email}</span>
        </div>
      );
    }

    if (account.phone) {
      contactInfo.push(
        <div
          key="phone"
          className="gba:flex gba:items-center gba:gap-2 gba:mb-1"
        >
          <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{account.phone}</span>
        </div>
      );
    }

    if (account.website) {
      contactInfo.push(
        <div key="website" className="gba:flex gba:items-center gba:gap-2">
          <Globe className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{account.website}</span>
        </div>
      );
    }

    return contactInfo.length > 0 ? (
      contactInfo
    ) : (
      <span className="gba:text-gray-400">No contact info</span>
    );
  };

  // Currency rendering via central formatter
  const renderAmount = (amount: number, currencyCode?: string) => {
    const { number, symbol } = formatCurrencyParts(amount, { currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (
      <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
        <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
        <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{symbol}</span>
      </div>
    );
  };

  // Render revenue (band code may be a single number or a range "min-max").
  const renderRevenueCell = (account: InvestmentAccount) => {
    const band = account.accountAnnualRevenueBand;
    if (!band?.code && !band?.value) {
      return <span className="gba:text-gray-400">-</span>;
    }

    const code = (band.code || "").trim();
    if (!code) {
      return <span className="gba:text-gray-400">-</span>;
    }

    // Parse numeric(s)
    const parts = code.split("-").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    if (parts.length === 0) {
      // Fallback to label if code not numeric
      return <span className="gba:text-sm">{band.value || "-"}</span>;
    }

    if (parts.length === 1) return renderAmount(parts[0]);

    // Range: show "min – max" with a single trailing symbol
    const [min, max] = parts;
    const left = formatCurrencyParts(min, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const right = formatCurrencyParts(max, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (
      <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
        <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{left.number} – {right.number}</span>
        <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{right.symbol}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes("account") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("name")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Account
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("contact") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("email")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Contact Info
                      {getSortIcon("email")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("location") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("geographicPresence")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Location
                      {getSortIcon("geographicPresence")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("industry") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("industryClass")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Industry
                      {getSortIcon("industryClass")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("legalForm") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("legalForm")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Legal Form
                      {getSortIcon("legalForm")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("size") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("companySize")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Size
                      {getSortIcon("companySize")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("revenue") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("annualRevenueBand")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Revenue
                      {getSortIcon("annualRevenueBand")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("owner") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("ownerEmployee")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Owner
                      {getSortIcon("ownerEmployee")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("created") && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("createdAt")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Created
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("actions") && (
                  <TableHead className="gba:w-[60px]"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="gba:text-center gba:py-8">
                    <div className="gba:text-gray-500">
                      {searchTerm
                        ? "No accounts found matching your search criteria."
                        : "No accounts available."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    data-testid={`investment-account-row-${account.id}`}
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                    onClick={() => handleRowClick(account.id)}
                  >
                    {visibleColumns.includes("account") && (
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <div>
                            <div className="gba:font-medium">{account.name}</div>
                            {/* Removed account code label per requirement */}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("contact") && (
                      <TableCell>
                        <div className="gba:min-w-[200px]">
                          {getContactInfo(account)}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("location") && (
                      <TableCell data-testid={`investment-account-location-cell-${account.id}`}>
                        <div className="gba:min-w-[200px]">
                          {(() => {
                            // Get the primary address from the investmentAddress array
                            const primaryAddress = account.investmentAddress?.find(addr => 
                              addr.addressType === 'PRIMARY_ADDRESS'
                            ) || account.investmentAddress?.[0];
                            
                            if (primaryAddress) {
                              const addressString = formatAddress({
                                addressLine: primaryAddress.addressLine,
                                locality: primaryAddress.locality,
                                postalCode: primaryAddress.postalCode,
                                country: primaryAddress.country?.value,
                                region: primaryAddress.region?.value,
                              });
                              
                              if (addressString) {
                                const addressParts = addressString.split('\n');
                                return (
                                  <div className="gba:flex gba:items-start gba:gap-2">
                                    <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
                                    <div className="gba:flex gba:flex-col gba:gap-1">
                                      {addressParts.map((part, index) => (
                                        <div key={index} className="gba:text-sm gba:leading-snug">
                                          {part}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            }
                            
                            // Fallback to geographicPresence if no address relationship
                            if (account.geographicPresence) {
                              return (
                                <div className="gba:flex gba:items-start gba:gap-2">
                                  <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
                                  <div className="gba:flex gba:flex-col gba:gap-1">
                                    <div className="gba:text-sm gba:leading-snug">
                                      {account.geographicPresence}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // No address data available
                            return (
                              <div className="gba:flex gba:items-start gba:gap-2">
                                <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
                                <span className="gba:text-sm gba:text-gray-400">No address</span>
                              </div>
                            );
                          })()}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("industry") && (
                      <TableCell>
                        {account.industryClass ? (
                          <Badge
                            variant="secondary"
                            data-testid={`investment-account-industry-${account.id}`}
                          >
                            {account.industryClass.value || account.industryClass.code}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("legalForm") && (
                      <TableCell>
                        {account.legalForm ? (
                          <Badge
                            variant="secondary"
                            data-testid={`investment-account-legal-form-${account.id}`}
                          >
                            {account.legalForm.value || account.legalForm.code}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("size") && (
                      <TableCell>
                        {account.companySize ? (
                          <Badge
                            variant="outline"
                            data-testid={`investment-account-size-${account.id}`}
                          >
                            {account.companySize.value || account.companySize.code}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("revenue") && (
                      <TableCell className="gba:text-right">
                        {renderRevenueCell(account)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("owner") && (
                      <TableCell>
                        {account.ownerEmployee ? (
                          <div
                            className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
                            data-testid={`investment-account-owner-link-${account.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const empId = account.ownerEmployee?.id;
                              if (empId) {
                                navigateTo(`/platform/employee-record?employeeId=${empId}`);
                              }
                            }}
                          >
                            <Avatar size="sm" className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full">
                              {account.ownerEmployee.pictureThumbnail && (
                                <AvatarImage
                                  src={`data:image/gif;base64,${account.ownerEmployee.pictureThumbnail}`}
                                  alt={getOwnerName(account)}
                                />
                              )}
                              <AvatarFallback>
                                {getOwnerName(account) !== "-"
                                  ? getOwnerName(account)
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "O"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">
                              {getOwnerName(account)}
                            </span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("created") && (
                      <TableCell>
                        {account.createdAt ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">
                              {formatDate(account.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("actions") && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`account-update-button-${account.id}`}
                            size="icon"
                            contextsArray={[
                              FlowContextName.investmentAccountEntity,
                            ]}
                            externalContextData={{ accountId: account.id }}
                            prefixDataTestId={`account-update`}
                            accessToken={context.accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick={true}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                    )}
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
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            accounts
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              data-testid="investment-accounts-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => onPageChange(currentPage + 1)}
              data-testid="investment-accounts-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
