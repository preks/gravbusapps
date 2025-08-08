import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Descriptions, Divider, Button } from 'antd';
import Pill from '@/components/pill/Pill';
import { getAdvancePaymentStatusDisplay } from '../../../utils/utils';
import { getExpensePlanStatusDisplay } from '../../../../personal-expenses/utils';
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { PiArrowRight, PiCalendarDuotone, PiClock, PiPath } from 'react-icons/pi';
import dayjs from 'dayjs';

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  selectedItem: any | null;
  onClose: () => void;
  type: 'advance-payment' | 'plan' | 'request';
}

export const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({
  selectedItem,
  onClose,
  type,
  ...contextProps
}) => {
  if (!selectedItem) return null;

  const renderAdvancePaymentDetails = () => (
    <div className="gba:p-4 gba:relative gba:mb-6">
      {/* Header: Title, Code, Status Pill */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div>
          <Typography.Title level={4} className="gba:mb-1">
            {selectedItem.title || selectedItem.description || 'N/A'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {selectedItem.code || 'N/A'}
          </Typography.Text>
        </div>
        <Pill
          type={getAdvancePaymentStatusDisplay(selectedItem.status).type}
          label={getAdvancePaymentStatusDisplay(selectedItem.status).label}
          className="gba:text-base"
          data-testid="advance-payment-status-pill"
        />
      </div>

      {/* Details Section */}
      <Descriptions size="small" column={1}>
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.reporter', 'Reporter')}>
          {selectedItem.employeeFullName || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}>
          {getAdvancePaymentStatusDisplay(selectedItem.status).label}
        </Descriptions.Item>
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount')}>
          <span style={{ fontWeight: 'bold' }}>
            {formatNumberFunction(String(selectedItem.expensePlan?.totalAmount || '0'))} {selectedItem.currency?.code || selectedItem.expensePlan?.currency?.code || ''}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.advance', 'Advance')}>
          <span style={{ fontWeight: 'bold' }}>
            {formatNumberFunction(String(selectedItem.amount || '0'))} {selectedItem.currency?.code || ''}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.payment_method', 'Payment Method')}>
          {selectedItem.paymentMethod === 'DIRECT_DEPOSIT' 
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                'Direct Deposit'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                'Cash Payment'
              )
          }
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  const renderPlanDetails = () => {
    const plan = selectedItem.expensePlan;
    if (!plan) return null;

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      let currencySymbol = '€'; // Default to Euro symbol
      if (plan.currency?.value) {
        currencySymbol = plan.currency.value === getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.european_euro', 'European euro') ? '€' : plan.currency.value.charAt(0);
      }
      return `${currencySymbol}${amount.toFixed(2)}`;
    };
    
    // Get trip type
    const getTripType = () => {
      if (plan.requestType?.value) {
        return plan.requestType.value;
      }
      const additionalProps = plan.additionalProperties as Record<string, unknown> | null;
      const tripType = additionalProps?.tripType ?? additionalProps?.travelType;
      return tripType ?? getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.business_travel', 'Business Travel');
    };

    return (
      <div className="gba:p-4 gba:relative gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <Typography.Title level={4} className="gba:mb-1">{plan.title}</Typography.Title>
            <Typography.Text type="secondary">{plan.code}</Typography.Text>
          </div>
          <Pill
            type={getExpensePlanStatusDisplay(plan.status).type} 
            label={getExpensePlanStatusDisplay(plan.status).label}
            className="gba:text-base"
            data-testid="expense-plan-status-pill"
          />
        </div>

        {plan.startDate && plan.endDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <PiCalendarDuotone className="gba:mr-2" />
            <Typography.Text className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:plan_details.duration', 'Duration')}: {' '}
              {dayjs(plan.startDate).format('DD.MM.YYYY')} {' → '} 
              {dayjs(plan.endDate).format('DD.MM.YYYY')}
            </Typography.Text>
          </div>
        )}
        
        {plan.planDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <PiClock className="gba:mr-2" />
            <Typography.Text className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:plan_details.plan_date', 'Plan Date')}: {' '}
              {dayjs(plan.planDate).format('DD.MM.YYYY')}
            </Typography.Text>
          </div>
        )}
        
        {plan.decisionDate && (
          <div className="gba:flex gba:items-center gba:mb-4">
            <PiPath className="gba:mr-2" />
            <Typography.Text className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.decision_date', 'Decision Date')}: {' '}
              {dayjs(plan.decisionDate).format('DD.MM.YYYY')}
            </Typography.Text>
          </div>
        )}
        
        {plan.description && (
          <Typography.Text className="gba:block gba:mb-4">{plan.description}</Typography.Text>
        )}
        
        <Descriptions size="small" column={1}>
          {plan.employee && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.requester', 'Requester')}>
              {plan.employee.fullName}
            </Descriptions.Item>
          )}
          
          {plan.employee?.employeePosition?.supervisor && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.manager_title', 'Manager')}>
              {plan.employee.employeePosition.supervisor.fullName}
            </Descriptions.Item>
          )}
          
          {plan.costCenter && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.request_cost_center', 'Cost Center')}>
              {plan.costCenter.name}
            </Descriptions.Item>
          )}
          
          {plan.project && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.select_project', 'Project')}>
              {plan.project.name}
            </Descriptions.Item>
          )}
          
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:plan_details.trip_type', 'Trip Type')}>
            {getTripType()}
          </Descriptions.Item>
          
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.total_amount', 'Total Amount')}>
            {typeof plan.totalAmount === 'number' ? formatCurrency(plan.totalAmount) : '-'}
          </Descriptions.Item>
          
          {plan.advancePaymentPaidAmount > 0 && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.advance_payment', 'Advance Payment')}>
              {formatCurrency(plan.advancePaymentPaidAmount)}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />
        
        <div className="gba:flex gba:justify-end gba:mt-4">
          <Button
            type="primary"
            icon={<PiArrowRight />}
            onClick={() => {
              // Navigate to the expense plan record page
              const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', { expensePlanId: plan.id });
              navigateTo(url);
            }}
            data-testid="view-expense-plan-details-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:plan_details.view_full_details', 'View Full Details')}
          </Button>
        </div>
      </div>
    );
  };

  const renderRequestDetails = () => {
    const expenseRequests = selectedItem.expensePlan?.expenseRequest;
    const request = Array.isArray(expenseRequests) && expenseRequests.length > 0 ? expenseRequests[0] : null;
    if (!request?.id) return null;

    return (
      <div className="gba:p-4 gba:relative gba:mb-6">
        {/* Header: Title, Code, Status Pill */}
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <Typography.Title level={4} className="gba:mb-1">
              {request.title || getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.title', 'Expense Request')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {request.code || 'N/A'}
            </Typography.Text>
          </div>
          <Pill
            type={getAdvancePaymentStatusDisplay(request.status).type}
            label={getAdvancePaymentStatusDisplay(request.status).label}
            className="gba:text-base"
            data-testid="request-status-pill"
          />
        </div>

        {/* Description */}
        {request.description && (
          <Typography.Text className="gba:block gba:mb-4">
            {request.description}
          </Typography.Text>
        )}

        {/* Details Section */}
        <Descriptions size="small" column={1}>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.requester', 'Requester')}>
            {selectedItem.employeeFullName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}>
            {getAdvancePaymentStatusDisplay(request.status).label}
          </Descriptions.Item>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.request_amount', 'Request Amount')}>
            <span style={{ fontWeight: 'bold' }}>
              {formatNumberFunction(String(request.totalAmount || '0'))} {request.currency?.code || selectedItem.currency?.code || ''}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.expense_request_container.current_title_label', 'Request Type')}>
            {request.requestType?.value || request.requestType || 'N/A'}
          </Descriptions.Item>
          {request.costCenter && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.request_cost_center', 'Cost Center')}>
              {request.costCenter.name || request.costCenter}
            </Descriptions.Item>
          )}
          {request.project && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.select_project', 'Project')}>
              {request.project.name || request.project}
            </Descriptions.Item>
          )}
          {request.startDate && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.departure_date', 'Start Date')}>
              {dayjs(request.startDate).format('DD.MM.YYYY')}
            </Descriptions.Item>
          )}
          {request.endDate && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.end_date', 'End Date')}>
              {dayjs(request.endDate).format('DD.MM.YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />
        
        <div className="gba:flex gba:justify-end gba:mt-4">
          <Button
            type="primary"
            icon={<PiArrowRight />}
            onClick={() => {
              // Navigate to the expense request record page
              const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { expenseRequestId: request.id });
              navigateTo(url);
            }}
            data-testid="view-expense-request-details-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:plan_details.view_full_details', 'View Full Details')}
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'advance-payment':
        return renderAdvancePaymentDetails();
      case 'plan':
        return renderPlanDetails();
      case 'request':
        return renderRequestDetails();
      default:
        return renderAdvancePaymentDetails();
    }
  };

  return renderContent();
};

export default AdvancePaymentDetails; 