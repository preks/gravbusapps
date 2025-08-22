import React, { useState, useEffect } from "react";
import {
  Button,
  Textarea,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Avatar,
  Separator,
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { AdvancePaymentApprovalProps, AdvancePaymentData } from "./types";
import { useGetAdvancePaymentForApproval } from "./queries";

const AdvancePaymentApproval: React.FC<
  AdvancePaymentApprovalProps & BusinessAppContextProps
> = ({
  paymentId,
  accessToken,
  additionalData,
  onClose = () => {},
  onApprove = () => {},
  onReject = () => {},
  ...contextProps
}) => {
  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedPaymentId, setExtractedPaymentId] = useState<string | null>(
    null
  );

  const { fetchAdvancePaymentData } =
    useGetAdvancePaymentForApproval(accessToken);

  useEffect(() => {
    if (!extractedPaymentId) {
      if (paymentId) {
        setExtractedPaymentId(paymentId);
      } else if (additionalData?.psi_taskPayload?.advancePayment?.id) {
        setExtractedPaymentId(additionalData.psi_taskPayload.advancePayment.id);
      }
    }
  }, [extractedPaymentId, paymentId, additionalData]);

  useEffect(() => {
    if (extractedPaymentId) {
      fetchPaymentData();
    }
  }, [extractedPaymentId]);

  const fetchPaymentData = async () => {
    if (!extractedPaymentId) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdvancePaymentData(extractedPaymentId);
      setPaymentData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch payment data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!extractedPaymentId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString();

      window.dispatchEvent(
        new CustomEvent("com.newwork.process.continue", {
          detail: {
            event: "pse_approve",
            payload: {
              changeMode: "INSERT",
              advancePaymentComment: {
                commentDate: today,
                comment: message || "",
                commentType: "APPROVE_COMMENT",
                authorEmployee:
                  contextProps.userInfo?.employeeDetails?.employeeId,
                advancePayment: extractedPaymentId,
              },
            },
          },
        })
      );

      onClose();
    } catch (err) {
      console.error("Error approving payment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!extractedPaymentId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString();

      window.dispatchEvent(
        new CustomEvent("com.newwork.process.continue", {
          detail: {
            event: "pse_reject",
            payload: {
              changeMode: "INSERT",
              advancePaymentComment: {
                commentDate: today,
                comment: message || "",
                commentType: "REJECT_COMMENT",
                authorEmployee:
                  contextProps.userInfo?.employeeDetails?.employeeId,
                advancePayment: extractedPaymentId,
              },
            },
          },
        })
      );

      onClose();
    } catch (err) {
      console.error("Error rejecting payment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "EUR",
    }).format(amount);
  };

  if (!extractedPaymentId || !accessToken) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.error",
                  "Configuration Error"
                )}
              </AlertTitle>
              <AlertDescription>
                Missing payment ID. Please check the platform configuration.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.error",
                  "Error Loading Data"
                )}
              </AlertTitle>
              <AlertDescription>
                Failed to load payment data: {error}
              </AlertDescription>
            </Alert>
            <div className="gba:mt-4">
              <Button onClick={fetchPaymentData}>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.retry",
                  "Retry"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.error",
                  "No Data Available"
                )}
              </AlertTitle>
              <AlertDescription>
                No payment data available for ID: {extractedPaymentId}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const {
    expensePlan,
    amount,
    description,
    currency,
    paymentMethod,
    costCenter,
  } = paymentData;
  const { employee } = expensePlan;

  return (
    <div
      className="gba:border-0"
      data-testid="advance-payment-approval-container"
    >
      <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
        <div className="gba:p-0">
          {/* Header Section */}
          <div
            className="gba:text-center gba:mb-6 gba:px-6 gba:pt-8"
            data-testid="advance-payment-approval-header"
          >
            <h1
              className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground gba:mb-2"
              data-testid="advance-payment-approval-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:advance_payment.approve_title",
                "Approve Advance Payment"
              )}
            </h1>
          </div>

          <Separator className="gba:h-px gba:bg-secondary gba:mb-8" />

          {/* Amount Display */}
          <div className="gba:flex gba:justify-between gba:items-center gba:px-6 gba:py-6 gba:border-b gba:border-border gba:mb-8">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:advance_payment.title",
                "Advance Payment"
              )}
            </h3>
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">
              {formatCurrency(amount, currency.code)}
            </div>
          </div>

          {/* Expense Plan and Employee Info */}
          <div className="gba:flex gba:flex-row gba:gap-8 gba:mb-8">
            <div className="gba:flex-1 gba:bg-card gba:rounded-lg gba:p-6">
              <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:expense_plan.title",
                  "Expense plan"
                )}
              </h3>
              <div className="gba:space-y-4 gba:text-sm">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:common.id",
                      "Id"
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:font-medium gba:ml-4 gba:text-right gba:break-words">
                    {expensePlan.code}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-start">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:common.title",
                      "Title"
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                    {expensePlan.title}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:common.type",
                      "Type"
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words">
                    {expensePlan.requestType.value}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:common.amount",
                      "Amount"
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:font-semibold gba:ml-4 gba:text-right gba:break-words">
                    {formatCurrency(
                      expensePlan.totalAmount,
                      expensePlan.currency.code
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="gba:flex-1 gba:bg-card gba:rounded-lg gba:p-6">
              <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.employee",
                  "Employee"
                )}
              </h3>
              <div className="gba:flex gba:items-center gba:gap-4">
                {employee.pictureThumbnail ? (
                  <img
                    src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="gba:w-14 gba:h-14 gba:rounded-full gba:object-cover gba:flex-shrink-0"
                    data-testid="employee-avatar"
                  />
                ) : (
                  <Avatar
                    className="gba:w-14 gba:h-14 gba:bg-blue-500 gba:flex-shrink-0"
                    data-testid="employee-avatar"
                  >
                    <span className="gba:text-lg gba:text-white">
                      {employee.firstName?.charAt(0) || "A"}
                    </span>
                  </Avatar>
                )}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-semibold gba:text-foreground gba:break-words gba:leading-relaxed gba:text-base">
                    {`${employee.firstName} ${employee.lastName}`}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                    {employee.employeePosition?.jobPosition?.name ||
                      "Unknown Role"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="gba:mb-8 gba:bg-card gba:rounded-lg gba:p-6">
            <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.notes",
                "Notes"
              )}
            </h3>
            <div className="gba:bg-gray-100 gba:p-4 gba:rounded-md gba:min-h-24 gba:text-sm gba:text-gray-700">
              {description ||
                getTranslationFromI18nKeyAndLabel(
                  "lowcoder:common.no_notes",
                  "No notes"
                )}
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="gba:mb-8 gba:bg-card gba:rounded-lg gba:p-6">
            <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:advance_payment.title",
                "Advance Payment"
              )}
            </h3>
            <div className="gba:space-y-4 gba:text-sm">
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:advance_payment.payment_method",
                    "Payment Method"
                  )}
                  :
                </span>
                <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                  {paymentMethod}
                </span>
              </div>
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:advance_payment.cost_center",
                    "Cost Center"
                  )}
                  :
                </span>
                <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                  {costCenter.name}
                </span>
              </div>
            </div>
          </div>

          {/* Message Section */}
          <div className="gba:px-6 gba:mb-8">
            <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.message",
                "Message"
              )}
            </h3>
            <Textarea
              placeholder={getTranslationFromI18nKeyAndLabel(
                "lowcoder:advance_payment.write_message_placeholder",
                "Write Message..."
              )}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="gba:min-h-24 gba:resize-y gba:w-full"
              data-testid="advance-payment-message-input"
            />
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:justify-end gba:gap-4 gba:px-6 gba:pb-8">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSubmitting}
              data-testid="advance-payment-reject-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.reject",
                "Reject"
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              data-testid="advance-payment-approve-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.approve",
                "Approve"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancePaymentApproval;
