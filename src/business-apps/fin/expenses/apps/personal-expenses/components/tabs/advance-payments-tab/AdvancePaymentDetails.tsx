import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Separator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system';
import { AdvancePayment } from '../../../hooks/useGetAdvancePayments';
import { getAdvancePaymentStatusDisplay } from '../../../utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: AdvancePayment;
  onClose: () => void;
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment, onClose }) => {
  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="advance-payment-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="advance-payment-title">
            Advance Payment Details
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="advance-payment-code">
            {payment.code}
          </p>
        </div>
        <Badge
          variant={
            getAdvancePaymentStatusDisplay(payment.status).type === 'completed' ? 'success' :
            getAdvancePaymentStatusDisplay(payment.status).type === 'error' ? 'destructive' :
            getAdvancePaymentStatusDisplay(payment.status).type === 'task' ? 'warning' :
            getAdvancePaymentStatusDisplay(payment.status).type === 'waiting' ? 'secondary' : 'default'
          }
          className="gba:text-sm"
          data-testid="advance-payment-status-badge"
        >
          {getAdvancePaymentStatusDisplay(payment.status).label}
        </Badge>
      </div>

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('advance.payment.description', 'Description')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.description ?? 'No description'}
              </span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('advance.payment.expensePlan', 'Expense Plan')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.expensePlan ? `${payment.expensePlan.code} - ${payment.expensePlan.title}` : 'No expense plan'}
              </span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('advance.payment.amount', 'Amount')}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                €{payment.amount?.toFixed(2) ?? '0.00'}
              </span>
            </div>

            {payment.costCenter && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('advance.payment.costCenter', 'Cost Center')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{payment.costCenter.name}</span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('advance.payment.paymentMethod', 'Payment Method')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.paymentMethod ?? 'Not specified'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
};

export default AdvancePaymentDetails;