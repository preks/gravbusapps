import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Checkbox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import {
  CalendarOutlined,
  RightOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
} from "@/common/utils/windowUtils";
import { useGetAdvancePaymentForApproval } from "./queries";
import { AdvancePaymentData, ConfirmTransferAdvPaymentProps } from "./types";

const ConfirmTransferAdvPayment: React.FC<ConfirmTransferAdvPaymentProps> = ({
  additionalData,
  contextProps,
}) => {
  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [extractedPaymentId, setExtractedPaymentId] = useState<string>("");

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForApproval(
    contextProps.userInfo?.employeeDetails?.employeeId || ""
  );

  useEffect(() => {
    if (additionalData?.value?.psi_taskPayload?.advancePayment?.id) {
      const paymentId = additionalData.value.psi_taskPayload.advancePayment.id;
      setExtractedPaymentId(paymentId);
      fetchPaymentData(paymentId);
    }
  }, [additionalData]);

  useEffect(() => {
    // Set today's date as default for transaction date
    const today = new Date().toISOString().split("T")[0];
    setTransactionDate(today);
  }, []);

  const fetchPaymentData = async (paymentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAdvancePaymentData(paymentId);
      setPaymentData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch payment data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!paymentData || !confirmationChecked) return;

    const payload = {
      advancePayment: {
        id: extractedPaymentId,
        version: paymentData.version,
        amount: paymentData.amount,
        transactionDate: transactionDate,
        transactionNumber: transactionId,
        transactionConfirmed: confirmationChecked,
        transactionConfirmedByEmployee:
          contextProps.userInfo?.employeeDetails?.employeeId,
      },
    };

    window.dispatchEvent(
      new CustomEvent("com.newwork.process.continue", {
        detail: payload,
      })
    );
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "var(--nw-spacing-xl)",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="error-alert">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!paymentData) {
    return (
      <Alert variant="destructive" data-testid="no-data-alert">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No payment data available</AlertDescription>
      </Alert>
    );
  }

  const { expensePlan } = paymentData;
  const { employee, requestType, currency: planCurrency } = expensePlan;

  return (
    <div data-testid="confirm-transfer-adv-payment-container">
      <Dialog open={true}>
        <DialogContent style={{ maxWidth: "600px", width: "100%" }}>
          <DialogHeader>
            <DialogTitle
              style={{
                textAlign: "center",
                fontSize: "var(--nw-font-size-xl)",
                fontWeight: "var(--nw-font-weight-semibold)",
              }}
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:confirm_transfer_advance_payment.advance_payment_transfer_title",
                "Confirm Advance Payment Transfer"
              )}
            </DialogTitle>
          </DialogHeader>

          <div style={{ padding: "var(--nw-spacing-lg)" }}>
            {/* Request Details Section */}
            <Card style={{ marginBottom: "var(--nw-spacing-lg)" }}>
              <CardContent>
                <h3
                  style={{
                    fontSize: "var(--nw-font-size-lg)",
                    fontWeight: "var(--nw-font-weight-semibold)",
                    marginBottom: "var(--nw-spacing-md)",
                    color: "var(--nw-color-text-primary)",
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:confirm_transfer_advance_payment.request_details",
                    "Request Details"
                  )}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--nw-spacing-md)",
                  }}
                >
                  <Avatar style={{ width: "48px", height: "48px" }}>
                    <AvatarImage
                      src={employee.pictureThumbnail}
                      alt={`${employee.firstName} ${employee.lastName}`}
                    />
                    <AvatarFallback>
                      {employee.firstName.charAt(0)}
                      {employee.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "var(--nw-font-size-lg)",
                        fontWeight: "var(--nw-font-weight-semibold)",
                        color: "var(--nw-color-text-primary)",
                      }}
                    >
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div style={{ color: "var(--nw-color-text-secondary)" }}>
                      {employee.employeePosition.jobPosition.name}
                    </div>
                    <div style={{ color: "var(--nw-color-text-secondary)" }}>
                      {employee.employeePosition.organizationalUnit.name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "var(--nw-spacing-md)",
                    padding: "var(--nw-spacing-md)",
                    backgroundColor: "var(--nw-color-surface-secondary)",
                    borderRadius: "var(--nw-border-radius-md)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--nw-color-text-secondary)",
                        fontSize: "var(--nw-font-size-sm)",
                      }}
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_item_list.expense_table.amount",
                        "Amount"
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--nw-font-size-xl)",
                        fontWeight: "var(--nw-font-weight-bold)",
                        color: "var(--nw-color-text-primary)",
                      }}
                    >
                      {formatCurrency(
                        paymentData.amount,
                        paymentData.currency.code
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: "var(--nw-color-text-secondary)",
                        fontSize: "var(--nw-font-size-sm)",
                      }}
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:confirm_transfer_advance_payment.request_date_label",
                        "Request Date"
                      )}
                    </div>
                    <div style={{ color: "var(--nw-color-text-primary)" }}>
                      {formatDate(expensePlan.planDate, "date.short")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "var(--nw-spacing-md)",
                  }}
                >
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: "var(--nw-color-warning-100)",
                      color: "var(--nw-color-warning-700)",
                      padding: "var(--nw-spacing-xs) var(--nw-spacing-sm)",
                      borderRadius: "var(--nw-border-radius-full)",
                      fontSize: "var(--nw-font-size-sm)",
                    }}
                  >
                    {paymentData.status}
                  </Badge>

                  <div style={{ display: "flex", gap: "var(--nw-spacing-sm)" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--nw-spacing-xs)",
                      }}
                    >
                      <RightOutlined />
                      {expensePlan.title}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--nw-spacing-xs)",
                      }}
                    >
                      <FileTextOutlined />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approved By Section */}
            <Card style={{ marginBottom: "var(--nw-spacing-lg)" }}>
              <CardContent>
                <h3
                  style={{
                    fontSize: "var(--nw-font-size-lg)",
                    fontWeight: "var(--nw-font-weight-semibold)",
                    marginBottom: "var(--nw-spacing-md)",
                    color: "var(--nw-color-text-primary)",
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:confirm_transfer_advance_payment.approved_by",
                    "Approved By"
                  )}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--nw-spacing-md)",
                  }}
                >
                  <Avatar style={{ width: "48px", height: "48px" }}>
                    <AvatarImage
                      src={
                        employee.employeePosition.supervisor.pictureThumbnail
                      }
                      alt={`${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}`}
                    />
                    <AvatarFallback>
                      {employee.employeePosition.supervisor.firstName.charAt(0)}
                      {employee.employeePosition.supervisor.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div
                      style={{
                        fontSize: "var(--nw-font-size-lg)",
                        fontWeight: "var(--nw-font-weight-semibold)",
                        color: "var(--nw-color-text-primary)",
                      }}
                    >
                      {employee.employeePosition.supervisor.firstName}{" "}
                      {employee.employeePosition.supervisor.lastName}
                    </div>
                    <div style={{ color: "var(--nw-color-text-secondary)" }}>
                      {
                        employee.employeePosition.supervisor.employeePosition
                          .jobPosition.name
                      }
                    </div>
                    <div style={{ color: "var(--nw-color-text-secondary)" }}>
                      {
                        employee.employeePosition.supervisor.employeePosition
                          .organizationalUnit.name
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Confirmation Section */}
            <Card style={{ marginBottom: "var(--nw-spacing-lg)" }}>
              <CardContent>
                <h3
                  style={{
                    fontSize: "var(--nw-font-size-lg)",
                    fontWeight: "var(--nw-font-weight-semibold)",
                    marginBottom: "var(--nw-spacing-md)",
                    color: "var(--nw-color-text-primary)",
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:confirm_transfer_advance_payment.transaction_confirmation_text",
                    "Transaction Confirmation"
                  )}
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--nw-spacing-md)",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "var(--nw-spacing-xs)",
                        color: "var(--nw-color-text-primary)",
                        fontWeight: "var(--nw-font-weight-medium)",
                      }}
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:confirm_transfer_advance_payment.transaction_date_label",
                        "Transaction Date"
                      )}
                      *
                    </label>
                    <div style={{ position: "relative" }}>
                      <Input
                        type="date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        style={{ paddingRight: "var(--nw-spacing-xl)" }}
                        data-testid="transaction-date-input"
                      />
                      <CalendarOutlined
                        style={{
                          position: "absolute",
                          right: "var(--nw-spacing-md)",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--nw-color-text-secondary)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "var(--nw-spacing-xs)",
                        color: "var(--nw-color-text-primary)",
                        fontWeight: "var(--nw-font-weight-medium)",
                      }}
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:confirm_transfer_advance_payment.transaction_id_label",
                        "Transaction ID"
                      )}
                    </label>
                    <Input
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "lowcoder:confirm_transfer_advance_payment.transaction_id_placeholder",
                        "Enter Transaction ID"
                      )}
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      data-testid="transaction-id-input"
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--nw-spacing-sm)",
                    }}
                  >
                    <Checkbox
                      checked={confirmationChecked}
                      onCheckedChange={(checked) =>
                        setConfirmationChecked(checked === true)
                      }
                      data-testid="confirmation-checkbox"
                    />
                    <label
                      style={{
                        color: "var(--nw-color-text-primary)",
                        fontSize: "var(--nw-font-size-sm)",
                        lineHeight: "1.4",
                      }}
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:confirm_transfer_advance_payment.checkbox_confirmation_message",
                        "I confirm that the payment has been transferred to the employee's account."
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confirm Button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button
                onClick={handleConfirm}
                disabled={!confirmationChecked}
                style={{
                  backgroundColor: confirmationChecked
                    ? "var(--nw-color-primary-500)"
                    : "var(--nw-color-surface-secondary)",
                  color: confirmationChecked
                    ? "var(--nw-color-on-primary)"
                    : "var(--nw-color-text-secondary)",
                  cursor: confirmationChecked ? "pointer" : "not-allowed",
                  opacity: confirmationChecked ? 1 : 0.6,
                  padding: "var(--nw-spacing-md) var(--nw-spacing-xl)",
                  fontSize: "var(--nw-font-size-md)",
                  fontWeight: "var(--nw-font-weight-medium)",
                  borderRadius: "var(--nw-border-radius-md)",
                  border: "none",
                  minWidth: "120px",
                }}
                data-testid="confirm-button"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:modify_expense_request.btn_items_submit",
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfirmTransferAdvPayment;
