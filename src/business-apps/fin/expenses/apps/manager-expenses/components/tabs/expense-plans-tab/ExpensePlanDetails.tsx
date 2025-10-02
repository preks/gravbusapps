import React from "react";
import {
  Badge,
  Separator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import { getExpensePlanStatusDisplay } from "../../../utils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { PiCalendarDuotone, PiClock, PiArrowRight } from "react-icons/pi";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { ExpensePlan } from "../../../hooks/useMainViewExpensePlans";

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpensePlan;
  onClose: () => void;
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({ selectedItem }) => {
  if (!selectedItem) return null;

  // Get user locale for currency and date formatting
  const userLocale = getCurrentActiveUserLocale();

  // Get trip type - for manager view, we'll use a default since we don't have requestType
  const getTripType = () => {
    return "Business Travel";
  };

  // Format amount with proper currency formatting
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(userLocale, {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-plan-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2
            className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-1"
            data-testid="expense-plan-title"
          >
            {selectedItem.title}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="expense-plan-code">
            {selectedItem.code}
          </p>
        </div>
        <Badge
          variant={
            getExpensePlanStatusDisplay(selectedItem.status).type === "completed"
              ? "success"
              : getExpensePlanStatusDisplay(selectedItem.status).type === "error"
                ? "destructive"
                : getExpensePlanStatusDisplay(selectedItem.status).type === "task"
                  ? "warning"
                  : getExpensePlanStatusDisplay(selectedItem.status).type === "waiting"
                    ? "secondary"
                    : "default"
          }
          className="gba:text-sm"
          data-testid="expense-plan-status-badge"
        >
          {getExpensePlanStatusDisplay(selectedItem.status).label}
        </Badge>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {selectedItem.startDate && selectedItem.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-muted-foreground" />
              <span className="gba:text-sm gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.plan_details.duration",
                  "Duration",
                )}
                :{" "}
                {new Date(selectedItem.startDate).toLocaleDateString(userLocale, {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })}{" "}
                {" → "}
                {new Date(selectedItem.endDate).toLocaleDateString(userLocale, {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>
          )}

          {selectedItem.planDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-muted-foreground" />
              <span className="gba:text-sm gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.plan_details.plan_date",
                  "Plan Date",
                )}
                :{" "}
                {new Date(selectedItem.planDate).toLocaleDateString(userLocale, {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {selectedItem.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:personal_expenses.description",
                "Description",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-foreground" data-testid="expense-plan-description">
              {selectedItem.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:personal_expenses.plan_details",
              "Plan Details",
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {selectedItem.employee && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_request_overview.side_bar.requester",
                    "Requester",
                  )}
                </span>
                <span className="gba:text-sm gba:text-foreground">
                  {selectedItem.employee.displayName || selectedItem.employee.fullName}
                </span>
              </div>
            )}

            {selectedItem.employee?.employeePosition?.organizationalUnit && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_profile.profile_icon_list.department_title",
                    "Department",
                  )}
                </span>
                <span className="gba:text-sm gba:text-foreground">
                  {selectedItem.employee.employeePosition.organizationalUnit.name}
                </span>
              </div>
            )}

            {selectedItem.employee?.employeePosition?.siteLocation && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_profile.profile_icon_list.location_title",
                    "Location",
                  )}
                </span>
                <span className="gba:text-sm gba:text-foreground">
                  {selectedItem.employee.employeePosition.siteLocation.name}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.plan_details.trip_type",
                  "Trip Type",
                )}
              </span>
              <span className="gba:text-sm gba:text-foreground">{getTripType()}</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:expense_request_list.expense_plan_table.total_amount",
                  "Total Amount",
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {typeof selectedItem.totalAmount === "number" && selectedItem.currency
                  ? formatAmount(selectedItem.totalAmount, selectedItem.currency)
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the expense plan record page
            const url = buildPlatformUrl("/platform/fin/expenses/expense-plan-record", {
              expensePlanId: selectedItem.id,
            });
            navigateTo(url);
          }}
          data-testid="view-expense-plan-details-button"
        >
          <PiArrowRight className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.plan_details.view_full_details",
            "View Full Details",
          )}
        </Button>
      </div>
    </div>
  );
};

export default ExpensePlanDetails;
