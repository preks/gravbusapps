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
import { navigateTo } from "@/common/utils/navigationUtils";

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
  sortOrder: "ASC" | "DESC";
  onClearFilters?: () => void;
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
  ...context
}) => {
  const handleRowClick = useCallback((accountId: string) => {
    navigateTo(`/platform/irm/account-record?accountId=${accountId}`);
  }, []);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === "ASC" ? "↑" : "↓";
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

  return (
    <div>
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("name")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Account
                    {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("email")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Contact Info
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("legalForm")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Legal Form
                    {getSortIcon("legalForm")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("industryClass")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Industry
                    {getSortIcon("industryClass")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("companySize")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Size
                    {getSortIcon("companySize")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("geographicPresence")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Location
                    {getSortIcon("geographicPresence")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("ownerEmployee")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Owner
                    {getSortIcon("ownerEmployee")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("createdAt")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Created
                    {getSortIcon("createdAt")}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="gba:text-center gba:py-8">
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
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                        <div>
                          <div className="gba:font-medium">{account.name}</div>
                          {account.code && (
                            <div className="gba:text-sm gba:text-gray-500">
                              Code: {account.code}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="gba:min-w-[200px]">
                        {getContactInfo(account)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.legalForm ? (
                        <Badge
                          variant="secondary"
                          data-testid={`investment-account-legal-form-${account.id}`}
                        >
                          {account.legalForm.code}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.industryClass ? (
                        <Badge
                          variant="secondary"
                          data-testid={`investment-account-industry-${account.id}`}
                        >
                          {account.industryClass.code}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.companySize ? (
                        <Badge
                          variant="outline"
                          data-testid={`investment-account-size-${account.id}`}
                        >
                          {account.companySize.code}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.geographicPresence && (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <MapPin className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {account.geographicPresence}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.ownerEmployee ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar size="sm">
                            {account.ownerEmployee.picture && (
                              <AvatarImage
                                src={account.ownerEmployee.picture}
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`account-update-button-${account.id}`}
                          size="icon"
                          contextsArray={[
                            FlowContextName.updateInvestmentAccount,
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
