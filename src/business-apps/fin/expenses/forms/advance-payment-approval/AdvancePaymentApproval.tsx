import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  CardContent,
  Avatar,
  Separator,
  Textarea,
  Badge,
  Spinner
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { startProcess } from '@/common/utils/start-process';
import { AdvancePaymentApprovalProps, AdvancePaymentData } from './types';
import { useGetAdvancePaymentForApproval } from './queries';

const AdvancePaymentApproval: React.FC<AdvancePaymentApprovalProps & BusinessAppContextProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  paymentId,
  accessToken,
  ...contextProps
}) => {
  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForApproval(accessToken);

  // Fetch payment data when modal opens
  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentData();
    }
  }, [isOpen, paymentId]);



  const fetchPaymentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdvancePaymentData(paymentId);
      setPaymentData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // Get current date in ISO format (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      
      // Start the approval process using startProcess utility
      startProcess({
        domain: 'employee-expenses',
        processName: 'approveAdvancePayment',
        payload: {
          event: 'pse_approve',
          changeMode: 'INSERT',
          advancePaymentComment: {
            commentDate: today,
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: contextProps.userInfo?.employeeDetails?.employeeId,
            advancePayment: paymentId
          }
        },
        builderType: 'NATIVE_SCREEN'
      });
      
      // Call the onApprove callback with success message
      await onApprove(message);
      onClose();
    } catch (err) {
      console.error('Error approving payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      // Get current date in ISO format (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      
      // Start the rejection process using startProcess utility
      startProcess({
        domain: 'employee-expenses',
        processName: 'rejectAdvancePayment',
        payload: {
          event: 'pse_reject',
          changeMode: 'INSERT',
          advancePaymentComment: {
            commentDate: today,
            comment: message || '',
            commentType: 'REJECT_COMMENT',
            authorEmployee: contextProps.userInfo?.employeeDetails?.employeeId,
            advancePayment: paymentId
          }
        },
        builderType: 'NATIVE_SCREEN'
      });
      
      // Call the onReject callback with success message
      await onReject(message);
      onClose();
    } catch (err) {
      console.error('Error rejecting payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'EUR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          style={{
            maxWidth: '600px',
            width: '90vw'
          }}
          data-testid="advance-payment-approval-modal"
        >
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--nw-spacing-12)',
            minHeight: '200px'
          }}>
            <Spinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          style={{
            maxWidth: '600px',
            width: '90vw'
          }}
          data-testid="advance-payment-approval-modal"
        >
          <div style={{
            padding: 'var(--nw-spacing-6)',
            textAlign: 'center'
          }}>
            <div style={{
              color: 'var(--nw-color-destructive)',
              marginBottom: 'var(--nw-spacing-4)'
            }}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:common.error',
                'Error'
              )}
            </div>
            <div style={{
              color: 'var(--nw-color-muted-foreground)',
              marginBottom: 'var(--nw-spacing-4)'
            }}>
              {error}
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="advance-payment-error-close-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:common.close',
                'Close'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!paymentData) {
    return null;
  }

  const { expensePlan, amount, description, currency, paymentMethod, costCenter } = paymentData;
  const { employee } = expensePlan;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none"
        data-testid="advance-payment-approval-modal"
      >
        <DialogHeader>
          <DialogTitle
            style={{
              textAlign: 'center',
              fontSize: 'var(--nw-font-size-xl)',
              fontWeight: 'var(--nw-font-weight-bold)',
              color: 'var(--nw-color-foreground)',
              margin: 0
            }}
            data-testid="advance-payment-approval-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_payment.approve_title',
              'Approve Advance Payment'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          {/* Expense Plan and Employee Info Section */}
          <div className="gba:flex gba:flex-row gba:gap-6 gba:mb-6">
            {/* Expense Plan Details - Left Side */}
            <Card className="gba:flex-1">
              <CardContent className="gba:p-4">
                <h3 className="gba:text-base gba:font-medium gba:mb-3 gba:text-gray-900">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_plan.title',
                    'Expense plan'
                  )}
                </h3>
                <div className="gba:space-y-3 gba:text-sm">
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium gba:text-gray-600">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:common.id', 'Id')}:
                    </span>
                    <span className="gba:text-gray-900">
                      {expensePlan.code}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium gba:text-gray-600">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:common.title', 'Title')}:
                    </span>
                    <span className="gba:text-gray-900">
                      {expensePlan.title}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium gba:text-gray-600">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:common.type', 'Type')}:
                    </span>
                    <span className="gba:text-gray-900">
                      {expensePlan.requestType.value}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium gba:text-gray-600">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:common.amount', 'Amount')}:
                    </span>
                    <span className="gba:text-gray-900 gba:font-semibold">
                      {formatCurrency(expensePlan.totalAmount, expensePlan.currency.code)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Information - Right Side */}
            <Card className="gba:flex-1">
              <CardContent className="gba:p-4">
                <h3 className="gba:text-base gba:font-medium gba:mb-3 gba:text-gray-900">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')}
                </h3>
                <div className="gba:flex gba:items-center gba:gap-3">
                  {employee.pictureThumbnail ? (
                    <img
                      src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="gba:w-12 gba:h-12 gba:rounded-full gba:object-cover gba:flex-shrink-0"
                      data-testid="employee-avatar"
                      onError={(e) => {
                        console.error('❌ Image failed to load:', employee.pictureThumbnail);
                        console.error('❌ Error event:', e);
                        console.error('❌ Target element:', e.currentTarget);
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', employee.pictureThumbnail);
                      }}
                    />
                  ) : (
                    <Avatar
                      className="gba:w-12 gba:h-12 gba:bg-blue-500 gba:flex-shrink-0"
                      data-testid="employee-avatar"
                    >
                      <span className="gba:text-lg gba:text-white">
                        {employee.firstName?.charAt(0) || 'A'}
                      </span>
                    </Avatar>
                  )}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:font-semibold gba:text-gray-900 gba:break-words gba:leading-relaxed">
                      {`${employee.firstName} ${employee.lastName}`}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                      {employee.employeePosition?.jobPosition?.name || 'Unknown Role'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <Card>
            <CardContent className="gba:p-4">
              <h3 className="gba:text-base gba:font-medium gba:mb-3 gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.notes', 'Notes')}
              </h3>
              <div className="gba:bg-gray-100 gba:p-4 gba:rounded-md gba:min-h-20 gba:text-sm gba:text-gray-700">
                {description || getTranslationFromI18nKeyAndLabel(
                  'lowcoder:common.no_notes',
                  'No notes'
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advance Payment Details */}
          <Card style={{ marginBottom: 'var(--nw-spacing-6)' }}>
            <CardContent style={{ padding: 'var(--nw-spacing-4)' }}>
              <h3 style={{
                margin: '0 0 var(--nw-spacing-3) 0',
                fontSize: 'var(--nw-font-size-lg)',
                fontWeight: 'var(--nw-font-weight-semibold)',
                color: 'var(--nw-color-foreground)'
              }}>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:advance_payment.title',
                  'Advance Payment'
                )}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nw-spacing-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--nw-color-muted-foreground)', flexShrink: 0 }}>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:advance_payment.payment_method',
                      'Payment Method'
                    )}:
                  </span>
                  <span style={{ textAlign: 'right', wordBreak: 'break-word', marginLeft: 'var(--nw-spacing-2)' }}>
                    {paymentMethod}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--nw-color-muted-foreground)', flexShrink: 0 }}>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:advance_payment.cost_center',
                      'Cost Center'
                    )}:
                  </span>
                  <span style={{ textAlign: 'right', wordBreak: 'break-word', marginLeft: 'var(--nw-spacing-2)' }}>
                    {costCenter.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advance Payment Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--nw-spacing-4) 0',
            borderTop: `1px solid var(--nw-color-border)`,
            borderBottom: `1px solid var(--nw-color-border)`
          }}>
            <h3 style={{
              margin: 0,
              fontSize: 'var(--nw-font-size-lg)',
              fontWeight: 'var(--nw-font-weight-semibold)',
              color: 'var(--nw-color-foreground)'
            }}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:advance_payment.title',
                'Advance Payment'
              )}
            </h3>
            <div style={{
              fontSize: 'var(--nw-font-size-2xl)',
              fontWeight: 'var(--nw-font-weight-bold)',
              color: 'var(--nw-color-foreground)'
            }}>
              {formatCurrency(amount, currency.code)}
            </div>
          </div>

          {/* Message Input */}
          <div style={{ marginBottom: 'var(--nw-spacing-6)' }}>
            <h3 style={{
              margin: '0 0 var(--nw-spacing-3) 0',
              fontSize: 'var(--nw-font-size-lg)',
              fontWeight: 'var(--nw-font-weight-semibold)',
              color: 'var(--nw-color-foreground)'
            }}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:common.message',
                'Message'
              )}
            </h3>
            <Textarea
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:advance_payment.write_message_placeholder',
                'Write Message...'
              )}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                minHeight: 'var(--nw-size-24)',
                resize: 'vertical'
              }}
              data-testid="advance-payment-message-input"
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--nw-spacing-3)'
          }}>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSubmitting}
              style={{
                borderColor: 'var(--nw-color-border)',
                color: 'var(--nw-color-foreground)',
                backgroundColor: 'var(--nw-color-background)'
              }}
              data-testid="advance-payment-reject-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:common.reject',
                'Reject'
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              style={{
                backgroundColor: 'var(--nw-color-foreground)',
                color: 'var(--nw-color-background)'
              }}
              data-testid="advance-payment-approve-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:common.approve',
                'Approve'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancePaymentApproval;
