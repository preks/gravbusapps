import React from "react";
import {
  Separator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import Pill from "@/components/pill";
import { PiArrowRight, PiCalendarDuotone, PiClock } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  getTranslationFromI18nKeyAndLabel,
  getDateFormat,
  formatNumberFunction,
} from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { getAdvancePaymentStatusDisplay } from "../../../utils";
import dayjs from "dayjs";

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any;
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  if (!payment) return null;

  // Get trip type
  const getTripType = () => {
    return payment.purpose || "Advance Payment";
  };

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="advance-payment-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2
            className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1"
            data-testid="advance-payment-title"
          >
            {payment.expensePlan?.title || "Advance Payment"}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="advance-payment-code">
            {payment.expensePlan?.code || payment.id}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {(() => {
            const statusConfig = getAdvancePaymentStatusDisplay(payment.status);
            return (
              <Pill
                type={statusConfig.type}
                label={statusConfig.label}
                color={statusConfig.color}
                data-testid="advance-payment-status-badge"
              />
            );
          })()}
        </div>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {payment.expensePlan?.startDate && payment.expensePlan?.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.plan_details.duration",
                  "Duration",
                )}
                : {dayjs(payment.expensePlan.startDate).format(getDateFormat("date.short"))} {" → "}
                {dayjs(payment.expensePlan.endDate).format(getDateFormat("date.short"))}
              </span>
            </div>
          )}

          {payment.createdAt && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:advance_payment_details.creation_date",
                  "Creation Date",
                )}
                : {dayjs(payment.createdAt).format(getDateFormat("date.short"))}
              </span>
            </div>
          )}

          {payment.dueDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:advance_payment_details.due_date",
                  "Due Date",
                )}
                : {dayjs(payment.dueDate).format(getDateFormat("date.short"))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {payment.purpose && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:advance_payment_details.purpose",
                "Purpose",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="advance-payment-purpose">
              {payment.purpose}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:advance_payment_details.title",
              "Advance Payment Details",
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {payment.expensePlan?.employee && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_request_overview.side_bar.requester",
                    "Requester",
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {payment.expensePlan.employee.displayName ||
                    payment.expensePlan.employee.fullName}
                </span>
              </div>
            )}

            {payment.expensePlan?.employee?.employeePosition?.organizationalUnit && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_profile.profile_icon_list.department_title",
                    "Department",
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {payment.expensePlan.employee.employeePosition.organizationalUnit.name}
                </span>
              </div>
            )}

            {payment.expensePlan?.employee?.employeePosition?.siteLocation && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_profile.profile_icon_list.location_title",
                    "Location",
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {payment.expensePlan.employee.employeePosition.siteLocation.name}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:advance_payment_details.purpose",
                  "Purpose",
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">{getTripType()}</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:advance_payment_details.amount",
                  "Amount",
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {typeof payment.amount === "number"
                  ? `${formatNumberFunction(String(payment.amount))} ${
                      payment.currencyRef?.split(":").pop() || "-"
                    }`
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="gba:flex gba:justify-end gba:gap-3">
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the advance payment record page
            const url = buildPlatformUrl("/platform/fin/expenses/advance-payment-record", {
              advancePaymentId: payment.id,
            });
            navigateTo(url);
          }}
          data-testid="advance-payment-view-details-button"
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

export default AdvancePaymentDetails;
