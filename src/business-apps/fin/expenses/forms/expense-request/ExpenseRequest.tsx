import React from 'react';
import { Divider, Typography, Form } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ICONS } from '../../utils/icons';
import { Button } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';
import { ExpenseRequestProvider, useExpenseRequestContext } from './context/ExpenseRequestContext';
import FormFooter from './components/FormFooter';
import ExpenseFormContent from './components/ExpenseFormContent';
import PlanFormContent from './components/PlanFormContent';
import { getCatalogTypeTransformer, transformPlansToCardData } from './utils/planUtils';
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState';
import { formatDateToISO } from '@/common/utils/windowUtils';
import { showToast } from '../../utils/notificationUtils';
import { FORM_STEPS, REQUEST_TYPES, REQUEST_STATUS} from './constants/constants';
import { EVENTS } from '../../utils/constants';
import './ExpenseRequest.css';

const { Title } = Typography;

interface ExpenseRequestContentProps {
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

interface PlanData {
  id: string;
  planType: string;
  title: string;
  creationDate: string;
  tripStart?: string;
  tripEnd?: string;
  tripInterval?: string;
  paymentAmount?: string | number;
  paymentCurrency?: string;
  planAmount: string | number;
  planCurrency: string;
}

const ExpenseRequestContent: React.FC<ExpenseRequestContentProps> = ({ accessToken, userInfo, additionalData }) => {
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
  } = useExpenseRequestContext();
  
  const [showTransportation, setShowTransportation] = React.useState(false);
  
  const [selectedPlan, setSelectedPlan] = React.useState<PlanData | null>(null);
  const [formIsValid, setFormIsValid] = React.useState<boolean>(false);
  
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData);
  
  
  const planData = React.useMemo(() => {
    if (!expenseCatalogueData?.ExpensePlan) return [];
    
    return transformPlansToCardData(expenseCatalogueData, t);
  }, [expenseCatalogueData, t]) || ([]);
  
  const isExpenseDisabled = React.useMemo(() => {
    const expenseType = getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData);
    return expenseType?.additionalValue1 === "disabled";
  }, [expenseCatalogueData]);
  
  const isTripDisabled = React.useMemo(() => {
    const tripType = getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData);
    return tripType?.additionalValue1 === "disabled";
  }, [expenseCatalogueData]);
  
  const handleExpenseClick = () => {
    setStep(FORM_STEPS.EXPENSE);
  };

  const handleTripClick = () => {
    setShowTransportation(true);
    setStep(FORM_STEPS.TRIP);
  };

  const handlePlanClick = () => {
    setStep(FORM_STEPS.PLAN);
  };

  const backButtonClick = () => {
    if (selectedPlan && step === FORM_STEPS.PLAN) {
      setSelectedPlan(null);
    } else {
      form.resetFields();
      setShowTransportation(false);
      setStep(FORM_STEPS.START);
    }
  }

  const handleCancel = () => {
    try {
      dispatchProcessContinueEventIfEnabled(
        EVENTS.ABORT, {
          "event": EVENTS.ABORT,
          pso_exitStrategy: "abort",
          pso_completeNotification: {
            type: 'error',
            messageKey: t(
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
      setSelectedPlan(null);
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
      let expenseTypeRef =""
      if(selectedPlan && selectedPlan?.planType){
        if(selectedPlan?.planType === 'TRIP'){
          expenseTypeRef = (getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData))?.id
        }else{
          expenseTypeRef = (getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData))?.id
        }}
        
      else{
        expenseTypeRef = (isTrip 
        ? (getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData))?.id
        : (getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData))?.id) || ""
      }
    
      
      let selectedPlanCurrency = "";
      if (selectedPlan && selectedPlan.id) {
        const planData = expenseCatalogueData?.ExpensePlan?.find((plan: { id: string }) => plan.id === selectedPlan.id);
        if (planData && planData.currency && planData.currency.id) {
          selectedPlanCurrency = planData.currency.id;
        }
      }
      
      // Create base request object
      const baseRequest = {
        requestTypeRef: expenseTypeRef,
        title: values.title,
        status: REQUEST_STATUS.CREATED,
        costCenter: values.costCenter,
        project: values.project,
        employee: employeeId,
        description: values.comment || "",
        expensePlan: selectedPlan?.id || "",
        requestDate: formatDateToISO(new Date()),
        currencyRef: selectedPlanCurrency || ""
      };
      
      // Add transportation means for trip requests
      const submitData = {
        expenseRequest: {
          ...baseRequest,
          ...(isTrip && values.transportationMeans ? { 
            additionalProperties: { transportationMeans: values.transportationMeans } 
          } : {})
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
        setTimeout(()=>{
          form.resetFields();
        setSelectedPlan(null);
        setStep(FORM_STEPS.START);
        }, 3000)
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
    <div className="gba:mainContainer" data-testid="expense-request-main-container">
{step === 'expense' || step === 'plan' || step === 'trip' ? (
        <>
          {/* Expense form header */}
          <div className="gba:headerContainer" data-testid="expense-form-header-container">
            <Button 
              variant="ghost" 
              className="gba:backButton" 
              onClick={backButtonClick}
              data-testid="expense-form-back-button"
            >
              <img 
                src={ICONS.BACK_ARROW} 
                className="gba:backIcon" 
                width="24" 
                height="24" 
                alt="Back"
                data-testid="expense-form-back-icon"
              />
            </Button>
            <div className="gba:titleContainer" data-testid="expense-form-title-container">
              <Title level={4} className="gba:headerTitle" data-testid="expense-form-header-title">
                {step =='plan' ? t('lowcoder:create_expense_request.initial_expense_plan_select_placeholder', 'Select Expense Plan') : step=='expense' ?t('lowcoder:create_expense_request.expense_request_container.create_expense_header', 'New Expense Request') : t('lowcoder:create_expense_request.expense_request_container.create_expense_header_trip', 'New Expense Request for Trip')}
              </Title>
            </div>
          </div>
          <Divider className="gba:headerDivider" data-testid="expense-form-header-divider" />
          
          {/* Expense form content */}
          {step === 'plan' ? (
            <>
              {selectedPlan ? (
                <>
                  <div className="gba:selectedPlanSection" data-testid="selected-plan-section">
                    <Typography.Text className="gba:selectedPlanLabel" data-testid="selected-plan-label">
                      {t('lowcoder:create_expense_request.expense_request_container.selected_plan_text', 'Selected Plan for your Request')}
                    </Typography.Text>
                    <Divider className="gba:selectedPlanDivider" data-testid="selected-plan-divider" />
                    <PlanFormContent 
                      form={form} 
                      planData={[selectedPlan]} 
                      isSelectedPlan={true} 
                    />
                  </div>
                  <Divider className="gba:contentDivider" data-testid="expense-form-content-divider" />
                  <ExpenseFormContent 
                    form={form} 
                    showTransportation={selectedPlan.planType === 'TRIP'} 
                    setFormIsValid={setFormIsValid} 
                    testIdPrefix="expense"
                    costCenters={costCenters}
                    projects={projects}
                    selectedCostCenter={selectedCostCenter}
                    setSelectedCostCenter={setSelectedCostCenter}
                    expenseCatalogueData={expenseCatalogueData}
                  />
                </>
              ) : (
                <PlanFormContent 
                  form={form} 
                  planData={planData} 
                  onPlanSelect={setSelectedPlan} 
                />
              )}
            </>
          ) : (
            <ExpenseFormContent 
              form={form} 
              showTransportation={showTransportation} 
              setFormIsValid={setFormIsValid} 
              testIdPrefix="expense"
              costCenters={costCenters}
              projects={projects}
              selectedCostCenter={selectedCostCenter}
              setSelectedCostCenter={setSelectedCostCenter}
              expenseCatalogueData={expenseCatalogueData}
            />
          )}
          
          {/* Footer with divider and action buttons - hide when selecting a plan */}
          {!(step === 'plan' && !selectedPlan) && (
            <FormFooter 
              step={selectedPlan ? 'expense' : step} 
              loading={loading}
              formIsValid={formIsValid}
              onCancel={handleCancel} 
              onSubmit={handleSubmit} 
              testIdPrefix="expense"
              additionalData={additionalData}
            />
          )}
        </>
      ) : (
      <>
        {/* Header */}
        <div className="gba:headerContainer" data-testid="expense-request-header-container">
          <div className="gba:titleContainer" data-testid="expense-request-title-container">
            <Title level={4} className="gba:headerTitle" data-testid="expense-request-header-title">
              {t('lowcoder:create_expense_request.initiate_title_header', 'Expense Request')}
            </Title>
          </div>
        </div>
        <Divider className="gba:headerDivider" data-testid="expense-request-header-divider" />

        <div className="gba:formContent" data-testid="expense-request-start-content">
          <Form
            form={form}
            layout="vertical"
            data-testid="expense-request-form"
            className="gba:flex gba:flex-col gba:flex-grow"
          >
          {/* Without Plan Section */}
          <div className="gba:sectionContainer" data-testid="expense-request-without-plan-section">
            <p className="gba:sectionTitle" data-testid="expense-request-without-plan-title">
              {t('lowcoder:create_expense_request.not_based_plan_text', 'Without Plan')}
            </p>

            {/* Expense Button - Only show if not disabled */}
            {!isExpenseDisabled && (
              <Button
                variant="ghost"
                className="gba:requestTypeButton"
                data-testid="expense-request-expense-button"
                onClick={handleExpenseClick}
              >
                <div className="gba:requestTypeButtonContent">
                  <div className="gba:requestTypeButtonLeft">
                    <img src={ICONS.RECEIPT_ICON} alt="Receipt" className="gba:requestTypeIcon" width="32" height="32" data-testid="expense-request-receipt-icon" />
                    <span className="gba:requestTypeText" data-testid="expense-request-expense-text">
                      {t('lowcoder:create_expense_request.expense_select_button', 'Expense')}
                    </span>
                  </div>
                  <img src={ICONS.RIGHT_ARROW} alt="Arrow" className="gba:requestTypeArrow" width="24" height="24" data-testid="expense-request-expense-arrow" />
                </div>
              </Button>
            )}

            {/* Trip Button - Only show if not disabled */}
            {!isTripDisabled && (
              <Button
                variant="ghost"
                className="gba:requestTypeButton"
                data-testid="expense-request-trip-button"
                onClick={handleTripClick}
              >
                <div className="gba:requestTypeButtonContent">
                  <div className="gba:requestTypeButtonLeft">
                    <img src={ICONS.TRIP_ICON} alt="Trip" className="gba:requestTypeIcon" width="32" height="32" data-testid="expense-request-trip-icon" />
                    <span className="gba:requestTypeText" data-testid="expense-request-trip-text">
                      {t('lowcoder:create_expense_request.trip_select_button', 'Trip')}
                    </span>
                  </div>
                  <img src={ICONS.RIGHT_ARROW} alt="Arrow" className="gba:requestTypeArrow" width="24" height="24" data-testid="expense-request-trip-arrow" />
                </div>
              </Button>
            )}
          </div>

          {/* Based on Plan Section - Only show if there are plans */}
          {(expenseCatalogueData?.ExpensePlan?.length > 0) && (
            <>
              {/* Divider */}
              <Divider className="gba:dividerMid" data-testid="expense-request-middle-divider" />

              <div className="gba:sectionContainer" data-testid="expense-request-with-plan-section">
                <p className="gba:sectionTitle" data-testid="expense-request-with-plan-title">
                  {t('lowcoder:create_expense_request.based_plan_text', 'Based on Plan')}
                </p>

                {/* Plan Button */}
                <Button
                  variant="ghost"
                  className="gba:requestTypeButton"
                  data-testid="expense-request-plan-button"
                  onClick={handlePlanClick}
                >
                  <div className="gba:requestTypeButtonContent">
                    <div className="gba:requestTypeButtonLeft">
                      <img src={ICONS.PLAN_ICON} alt="Plan" className="gba:requestTypeIcon" width="32" height="32" data-testid="expense-request-plan-icon" />
                      <span className="gba:requestTypeText" data-testid="expense-request-plan-text">
                        {t('lowcoder:create_expense_request.plan_select_button', 'My expense plans')} ({expenseCatalogueData?.ExpensePlan?.length})
                      </span>
                    </div>
                    <img src={ICONS.RIGHT_ARROW} alt="Arrow" className="gba:requestTypeArrow" width="24" height="24" data-testid="expense-request-plan-arrow" />
                  </div>
                </Button>
              </div>
            </>
          )}

            {/* Spacer to push content to the top */}
            <div className="gba:flex-grow" data-testid="expense-request-spacer" />
          </Form>
        </div>
        
        {/* Footer with divider and action buttons */}
        <FormFooter 
          step={step} 
          onCancel={handleCancel} 
          testIdPrefix="expense"
          additionalData={additionalData}
        />
      </>
      )}
    </div>
  );
};

/**
 * Expense Request component
 * @param props - Business app context props
 * @returns Expense Request component
 */
const ExpenseRequest: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo, additionalData } = props;
  
  return (
    <div className="gba:expenseRequestWrapper" data-testid="expense-request-wrapper">
      <ExpenseRequestProvider {...props}>
        <ExpenseRequestContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </ExpenseRequestProvider>
    </div>
  );
};

export default ExpenseRequest;
