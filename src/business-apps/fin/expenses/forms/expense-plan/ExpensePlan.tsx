import React from 'react';
import { Divider, Typography, Form } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ICONS } from '../../utils/icons';
import { Button } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';
import { ExpensePlanProvider, useExpensePlanContext } from './context/ExpensePlanContext';
import { FormFooter, ExpenseFormContent } from './components';

import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState';

import { showToast } from '../../utils/notificationUtils';
import { FORM_STEPS, PLAN_TYPES, PLAN_STATUS} from './constants/constants';
import { EVENTS } from '../../utils/constants';
import { formatDateToISO, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { getCatalogTypeTransformer } from '../expense-request/utils/planUtils';


const { Title } = Typography;

interface ExpensePlanContentProps {
  accessToken?: string;
  userInfo?: any;
  additionalData?: any;
}

interface ExpenseFormValues {
  title: string;
  costCenter: string;
  project?: string;
  comment?: string;
  transportationMeans?: string[];
}

const ExpensePlanContent: React.FC<ExpensePlanContentProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { 
    step, 
    setStep, 
    loading,
    setLoading,
    expenseCatalogueData,
    costCenters,
    projects,
    selectedCostCenter,
    setSelectedCostCenter
  } = useExpensePlanContext();
  
  const [showTransportation, setShowTransportation] = React.useState(false);
  const [formIsValid, setFormIsValid] = React.useState<boolean>(false);
  
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData);
  
  const isExpenseDisabled = React.useMemo(() => {
    const expenseType = getCatalogTypeTransformer(PLAN_TYPES.EXPENSE, expenseCatalogueData);
    return expenseType?.additionalValue1 === "disabled";
  }, [expenseCatalogueData]);
  
  const isTripDisabled = React.useMemo(() => {
    const tripType = getCatalogTypeTransformer(PLAN_TYPES.TRIP, expenseCatalogueData);
    return tripType?.additionalValue1 === "disabled";
  }, [expenseCatalogueData]);
  
  const handleExpenseClick = () => {
    setStep(FORM_STEPS.EXPENSE);
  };

  const handleTripClick = () => {
    setShowTransportation(true);
    setStep(FORM_STEPS.EXPENSE);
  };

  const backButtonClick = () => {
    form.resetFields();
    setShowTransportation(false);
    setStep(FORM_STEPS.START);
  }

  const handleCancel = () => {
    try {
      dispatchProcessContinueEventIfEnabled(
        EVENTS.ABORT, {
          "event": EVENTS.ABORT,
          pso_exitStrategy: "abort",
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
              )
          }
        });
    } catch (processError) {
      showToast(
        t("lowcoder:create_expense_type_item.error_flows_message", "Error in flow process"),
        "error"
      );
      form.resetFields();
      setStep(FORM_STEPS.START);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await form.validateFields();
      
      const values = form.getFieldsValue() as ExpenseFormValues;
      
      const employeeId = userInfo?.employeeDetails?.employeeId;
      if (!accessToken || !employeeId) {
        showToast(
          t('lowcoder:create_expense_request.error_missing_user_info', 'Missing user information'),
          'error'
        );
        setLoading(false);
        return;
      }
      
      const isTrip = step === FORM_STEPS.EXPENSE && values.transportationMeans;
     
      const expenseTypeRef = (isTrip 
        ? (getCatalogTypeTransformer(PLAN_TYPES.TRIP, expenseCatalogueData))?.id
        : (getCatalogTypeTransformer(PLAN_TYPES.EXPENSE, expenseCatalogueData))?.id) || ""
    
      // Create submit data with the specified structure
      const submitData = {
        employeeId: employeeId,
        expensePlan: {
          requestTypeRef: expenseTypeRef,
          title: values.title,
          status: PLAN_STATUS.CREATED,
          costCenter: values.costCenter,
          employee: employeeId,
          description: values.comment || "",
          planDate: formatDateToISO(new Date()),
          ...(isTrip && values.transportationMeans && {
            additionalProperties: {
              transportationMeans: values.transportationMeans
            }
          }),
          project: values.project
        },
        event: EVENTS.SUBMIT
      };
      
      let operationSuccessful = false;
      
      try {
        dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData);
        operationSuccessful = true;
      } catch (processError) {
        showToast(
          t("lowcoder:create_expense_type_item.error_flows_message", "Error in flow process"),
          "error"
        );
      }
      
      if (operationSuccessful) {
        form.resetFields();
        setStep(FORM_STEPS.START);
      }
    } catch (error) {
      showToast(
        t("lowcoder:create_expense_request.error_fields_validation", "Please check all required fields"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gba:mainContainer" data-testid="expense-plan-main-container">
      {step === 'expense' ? (
        <>
          {/* Expense form header */}
          <div className="gba:headerContainer" data-testid="expense-plan-form-header-container">
            <Button 
              variant="ghost" 
              className="gba:backButton" 
              onClick={backButtonClick}
              data-testid="expense-plan-form-back-button"
            >
              <img 
                src={ICONS.BACK_ARROW} 
                className="gba:backIcon" 
                width="24" 
                height="24" 
                alt="Back"
                data-testid="expense-plan-form-back-icon"
              />
            </Button>
            <div className="gba:titleContainer" data-testid="expense-plan-form-title-container">
              <Title level={4} className="gba:headerTitle" data-testid="expense-plan-form-header-title">
                {showTransportation ? t('lowcoder:initiate_expense_plan.expense_create_trip_plan.header_title', 'Plan New Trip') : t('lowcoder:initiate_expense_plan.create_expense_plan.header_title', 'Plan New Expense')}
              </Title>
            </div>
          </div>
          <Divider className="gba:headerDivider" data-testid="expense-plan-form-header-divider" />
          
          {/* Expense form content */}
          <ExpenseFormContent 
            form={form} 
            showTransportation={showTransportation} 
            setFormIsValid={setFormIsValid} 
            testIdPrefix="expense-plan"
            costCenters={costCenters}
            projects={projects}
            selectedCostCenter={selectedCostCenter}
            setSelectedCostCenter={setSelectedCostCenter}
            expenseCatalogueData={expenseCatalogueData}
          />
          
          {/* Footer with divider and action buttons */}
          <FormFooter 
            step={step} 
            loading={loading}
            formIsValid={formIsValid}
            onCancel={handleCancel} 
            onSubmit={handleSubmit} 
            testIdPrefix="expense-plan"
            additionalData={additionalData}
          />
        </>
      ) : (
        <>
          {/* Header */}
          <div className="gba:headerContainer" data-testid="expense-plan-header-container">
            <div className="gba:titleContainer" data-testid="expense-plan-title-container">
              <Title level={4} className="gba:headerTitle" data-testid="expense-plan-header-title">
                {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.header_container', 'Create Expense Plan')}
              </Title>
            </div>
          </div>
          <Divider className="gba:headerDivider" data-testid="expense-plan-header-divider" />

          <div className="gba:formContent" data-testid="expense-plan-start-content">
            <Form
              form={form}
              layout="vertical"
              data-testid="expense-plan-form"
              className="gba:flex gba:flex-col gba:flex-grow"
            >
              {/* Without Plan Section */}
              <div className="gba:sectionContainer" data-testid="expense-plan-without-plan-section">

                {/* Expense Button - Only show if not disabled */}
                {!isExpenseDisabled && (
                  <Button
                    variant="ghost"
                    className="gba:requestTypeButton"
                    data-testid="expense-plan-expense-button"
                    onClick={handleExpenseClick}
                  >
                    <div className="gba:requestTypeButtonContent">
                      <div className="gba:requestTypeButtonLeft">
                        <img src={ICONS.RECEIPT_ICON} alt="Receipt" className="gba:requestTypeIcon" width="32" height="32" data-testid="expense-plan-receipt-icon" />
                        <span className="gba:requestTypeText" data-testid="expense-plan-expense-text">
                          {t('lowcoder:create_expense_request.expense_select_button', 'Expense')}
                        </span>
                      </div>
                      <img src={ICONS.RIGHT_ARROW} alt="Arrow" className="gba:requestTypeArrow" width="24" height="24" data-testid="expense-plan-expense-arrow" />
                    </div>
                  </Button>
                )}

                {/* Trip Button - Only show if not disabled */}
                {!isTripDisabled && (
                  <Button
                    variant="ghost"
                    className="gba:requestTypeButton"
                    data-testid="expense-plan-trip-button"
                    onClick={handleTripClick}
                  >
                    <div className="gba:requestTypeButtonContent">
                      <div className="gba:requestTypeButtonLeft">
                        <img src={ICONS.TRIP_ICON} alt="Trip" className="gba:requestTypeIcon" width="32" height="32" data-testid="expense-plan-trip-icon" />
                        <span className="gba:requestTypeText" data-testid="expense-plan-trip-text">
                          {t('lowcoder:create_expense_request.trip_select_button', 'Trip')}
                        </span>
                      </div>
                      <img src={ICONS.RIGHT_ARROW} alt="Arrow" className="gba:requestTypeArrow" width="24" height="24" data-testid="expense-plan-trip-arrow" />
                    </div>
                  </Button>
                )}
              </div>

              {/* Spacer to push content to the top */}
              <div className="gba:flex-grow" data-testid="expense-plan-spacer" />
            </Form>
          </div>
          
          {/* Footer with divider and action buttons */}
          <FormFooter 
            step={step} 
            onCancel={handleCancel} 
            testIdPrefix="expense-plan"
            additionalData={additionalData}
          />
        </>
      )}
    </div>
  );
};

/**
 * Expense Plan component
 * @param props - Business app context props
 * @returns Expense Plan component
 */
const ExpensePlan: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo, additionalData } = props;
  
  return (
    <div className="gba:expensePlanWrapper" data-testid="expense-plan-wrapper">
      <ExpensePlanProvider {...props}>
        <ExpensePlanContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </ExpensePlanProvider>
    </div>
  );
};

export default ExpensePlan; 