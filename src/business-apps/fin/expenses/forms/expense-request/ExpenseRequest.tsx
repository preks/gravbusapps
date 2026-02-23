import React from 'react'
import { Divider, Typography, Form } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner } from '@newwork/nw-design-system'
import { ICONS } from '../../utils/icons'
import { Button } from '@newwork/gravity-ui-catalog'
import { ExpenseRequestProvider, useExpenseRequestContext } from './context/ExpenseRequestContext'
import FormFooter from './components/FormFooter'
import ExpenseFormContent from './components/ExpenseFormContent'
import PlanFormContent from './components/PlanFormContent'
import { getCatalogTypeTransformer, transformPlansToCardData } from './utils/planUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { formatDateToISO, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { showToast } from '../../utils/notificationUtils'
import { FORM_STEPS, REQUEST_TYPES, REQUEST_STATUS, DISABLED_FLAG, PLAN_TYPE_ENUM } from './constants/constants'
import { EVENTS } from '../../utils/constants'
import { FormHeaderTitle } from './components'

interface ExpenseRequestContentProps {
  accessToken?: string
  userInfo?: any
  additionalData?: any
}

interface ExpenseFormValues {
  title: string
  costCenter: string
  project?: string
  comment?: string
  transportationMeans?: string[]
}

interface PlanData {
  id: string
  planType: string
  title: string
  creationDate: string
  tripStart?: string
  tripEnd?: string
  tripInterval?: string
  paymentAmount?: string | number
  paymentCurrency?: string
  planAmount: string | number
  planCurrency: string
}

const ExpenseRequestContent: React.FC<ExpenseRequestContentProps> = ({ accessToken, userInfo, additionalData }) => {
  const [form] = Form.useForm()
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
  } = useExpenseRequestContext()

  const [showTransportation, setShowTransportation] = React.useState(false)

  const [selectedPlan, setSelectedPlan] = React.useState<PlanData | null>(null)
  const [formIsValid, setFormIsValid] = React.useState<boolean>(false)

  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  // Extract expensePlanId from additionalData if available
  const expensePlanId = React.useMemo(() => {
    return additionalData?.psi_taskPayload?.psi_initialParameters?.expensePlanId
  }, [additionalData])

  const planData =
    React.useMemo(() => {
      if (!expenseCatalogueData?.ExpensePlan) return []

      return transformPlansToCardData(expenseCatalogueData)
    }, [expenseCatalogueData]) || []

  const isExpenseDisabled = React.useMemo(() => {
    const expenseType = getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData)
    return expenseType?.additionalValue1 === DISABLED_FLAG
  }, [expenseCatalogueData])

  const isTripDisabled = React.useMemo(() => {
    const tripType = getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData)
    return tripType?.additionalValue1 === DISABLED_FLAG
  }, [expenseCatalogueData])

  /** Show loader on START until catalogue is loaded so request-type visibility (e.g. hide expense for Selgros) is known and no flicker */
  const isStartStepConditionsLoading = React.useMemo(
    () =>
      step === FORM_STEPS.START &&
      (loading || (expenseCatalogueData == null && Boolean(userInfo?.employeeDetails?.employeeId))),
    [step, loading, expenseCatalogueData, userInfo?.employeeDetails?.employeeId]
  )

  /** Stable title for start step so memoized header does not re-render when context updates. */
  const expenseRequestStartTitle = React.useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_title_header', 'Expense Request'),
    []
  )

  const handleExpenseClick = () => {
    setStep(FORM_STEPS.EXPENSE)
  }

  const handleTripClick = () => {
    setShowTransportation(true)
    setStep(FORM_STEPS.TRIP)
  }

  const handlePlanClick = () => {
    setStep(FORM_STEPS.PLAN)
  }

  /**
   * Parses additional properties from string or object
   */
  const parseAdditionalProperties = (additionalProps: any): any => {
    if (typeof additionalProps === 'string') {
      try {
        return JSON.parse(additionalProps)
      } catch {
        return {}
      }
    }
    return additionalProps
  }

  /**
   * Builds form values from plan data
   */
  const buildFormValuesFromPlan = (fullPlanData: any, plan: PlanData): Partial<ExpenseFormValues> => {
    const formValues: Partial<ExpenseFormValues> = {}

    if (fullPlanData.title) {
      formValues.title = fullPlanData.title
    }

    if (fullPlanData.costCenter?.id) {
      formValues.costCenter = fullPlanData.costCenter.id
      setSelectedCostCenter(fullPlanData.costCenter.id)
    }

    if (fullPlanData.projectId) {
      formValues.project = fullPlanData.projectId
    }

    if (fullPlanData.description) {
      formValues.comment = fullPlanData.description
    }

    // Handle trip-specific fields
    if (plan.planType === PLAN_TYPE_ENUM.TRIP) {
      setShowTransportation(true)
      const additionalProps = parseAdditionalProperties(fullPlanData.additionalProperties)

      if (additionalProps?.transportationMeans) {
        formValues.transportationMeans = additionalProps.transportationMeans
      }
    }

    return formValues
  }

  /**
   * Updates form validity state
   */
  const updateFormValidity = (): void => {
    const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0)
    if (setFormIsValid) {
      setFormIsValid(isFormValidValue)
    }
  }

  const handlePlanSelect = React.useCallback(
    (plan: PlanData) => {
      setSelectedPlan(plan)
      const fullPlanData = expenseCatalogueData?.ExpensePlan?.find((p: any) => p.id === plan.id)

      if (!fullPlanData) return

      const formValues = buildFormValuesFromPlan(fullPlanData, plan)
      form.setFieldsValue(formValues)
      updateFormValidity()
    },
    [expenseCatalogueData, form, setSelectedCostCenter]
  )

  // Auto-select plan when expensePlanId is provided and form is at start step
  React.useEffect(() => {
    if (expensePlanId && step === FORM_STEPS.START && expenseCatalogueData?.ExpensePlan && planData.length > 0) {
      const planToSelect = planData.find((plan: PlanData) => plan.id === expensePlanId)

      if (planToSelect) {
        handlePlanSelect(planToSelect)
        setStep(FORM_STEPS.PLAN)
      }
    }
  }, [expensePlanId, step, expenseCatalogueData, planData, handlePlanSelect, setStep])

  const backButtonClick = () => {
    if (selectedPlan && step === FORM_STEPS.PLAN) {
      setSelectedPlan(null)
    } else {
      form.resetFields()
      setShowTransportation(false)
      setStep(FORM_STEPS.START)
    }
  }

  const handleCancel = () => {
    try {
      dispatchProcessContinueEventIfEnabled(EVENTS.ABORT, {
        event: EVENTS.ABORT,
        pso_exitStrategy: 'abort',
        pso_completeNotification: {
          type: 'error',
          messageKey: getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_module.toast_notification_cancel_create_absence',
            'The action has been canceled.'
          )
        }
      })
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_type_item.error_flows_message',
          'Error in flow process'
        ),
        'error'
      )
      form.resetFields()
      setSelectedPlan(null)
      setStep(FORM_STEPS.START)
    }
  }

  /**
   * Determines the expense type reference based on plan type or step
   */
  const determineExpenseTypeRef = (isTrip: boolean): string => {
    if (selectedPlan?.planType) {
      if (selectedPlan.planType === PLAN_TYPE_ENUM.TRIP) {
        return getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData)?.id || ''
      }
      return getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData)?.id || ''
    }

    return isTrip
      ? getCatalogTypeTransformer(REQUEST_TYPES.TRIP, expenseCatalogueData)?.id || ''
      : getCatalogTypeTransformer(REQUEST_TYPES.EXPENSE, expenseCatalogueData)?.id || ''
  }

  /**
   * Gets the currency from selected plan
   */
  const getSelectedPlanCurrency = (): string => {
    if (!selectedPlan?.id) return ''

    const planData = expenseCatalogueData?.ExpensePlan?.find((plan: { id: string }) => plan.id === selectedPlan.id)
    return planData?.currency?.id || ''
  }

  /**
   * Creates the submit data payload
   */
  const createSubmitData = (
    values: ExpenseFormValues,
    employeeId: string,
    isTrip: boolean,
    expenseTypeRef: string,
    selectedPlanCurrency: string
  ): any => {
    const baseRequest = {
      requestTypeRef: expenseTypeRef,
      title: values.title,
      status: REQUEST_STATUS.CREATED,
      costCenter: values.costCenter,
      project: values.project || '',
      employee: employeeId,
      description: values.comment || '',
      expensePlan: selectedPlan?.id || '',
      requestDate: formatDateToISO(new Date()),
      currencyRef: selectedPlanCurrency || ''
    }

    return {
      expenseRequest: {
        ...baseRequest,
        ...(isTrip && values.transportationMeans
          ? {
              additionalProperties: { transportationMeans: values.transportationMeans }
            }
          : {})
      },
      event: EVENTS.SUBMIT
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await form.validateFields()

      const values = form.getFieldsValue() as ExpenseFormValues
      const employeeId = userInfo?.employeeDetails?.employeeId

      // Validate required data
      if (!accessToken || !employeeId) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.error_missing_user_info',
            'Missing user information'
          ),
          'error'
        )
        setLoading(false)
        return
      }

      // Determine request type and prepare data
      const isTrip = step === FORM_STEPS.TRIP || selectedPlan?.planType === PLAN_TYPE_ENUM.TRIP
      const expenseTypeRef = determineExpenseTypeRef(isTrip)
      const selectedPlanCurrency = getSelectedPlanCurrency()

      // Create and submit data
      const submitData = createSubmitData(values, employeeId, isTrip, expenseTypeRef, selectedPlanCurrency)

      try {
        dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.error_flows_message',
            'Error in flow process'
          ),
          'error'
        )
      }
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.error_fields_validation',
          'Please check all required fields'
        ),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="gba:mx-auto gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px', minHeight: 'calc(100vh - 10px)', fontFamily: "'Roboto', sans-serif" }}
      data-testid="expense-request-main-container"
    >
      {step === FORM_STEPS.EXPENSE || step === FORM_STEPS.PLAN || step === FORM_STEPS.TRIP ? (
        <>
          {/* Expense form header */}
          <div
            className="gba:flex gba:items-center"
            style={{
              paddingTop: '40px',
              paddingBottom: '30px',
              height: '2rem',
              boxSizing: 'content-box',
              position: 'relative',
              fontFamily: "'Roboto', sans-serif",
              marginBottom: '16px'
            }}
            data-testid="expense-form-header-container"
          >
            <Button
              variant="ghost"
              style={{ padding: '0', marginRight: '16px', border: 'none', background: 'transparent' }}
              onClick={backButtonClick}
              data-testid="expense-form-back-button"
            >
              <img
                src={ICONS.BACK_ARROW}
                style={{ width: '24px', height: '24px' }}
                width="24"
                height="24"
                alt="Back"
                data-testid="expense-form-back-icon"
              />
            </Button>
            <FormHeaderTitle
              title={
                step === FORM_STEPS.PLAN
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.initial_expense_plan_select_placeholder',
                      'Select Expense Plan'
                    )
                  : step === REQUEST_TYPES.EXPENSE
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.expense_request_container.create_expense_header',
                        'New Expense Request'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.expense_request_container.create_expense_header_trip',
                        'New Expense Request for Trip'
                      )
              }
              titleContainerTestId="expense-form-title-container"
              headerTitleTestId="expense-form-header-title"
            />
          </div>
          <Divider style={{ margin: '0 0 30px 0' }} data-testid="expense-form-header-divider" />

          {/* Expense form content */}
          {step === FORM_STEPS.PLAN ? (
            <>
              {selectedPlan ? (
                <>
                  <div style={{ marginBottom: '0px' }} data-testid="selected-plan-section">
                    <Typography.Text
                      className="gba:block gba:px-4 gba:text-base gba:font-medium gba:mb-0 gba:text-foreground"
                      data-testid="selected-plan-label"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.expense_request_container.selected_plan_text',
                        'Selected Plan for your Request'
                      )}
                    </Typography.Text>
                    <Divider style={{ margin: '30px 0 24px 0px' }} data-testid="selected-plan-divider" />
                    <PlanFormContent form={form} planData={[selectedPlan]} isSelectedPlan={true} />
                  </div>
                  <Divider style={{ margin: '24px 0' }} data-testid="expense-form-content-divider" />
                  <ExpenseFormContent
                    form={form}
                    showTransportation={selectedPlan.planType === PLAN_TYPE_ENUM.TRIP}
                    setFormIsValid={setFormIsValid}
                    testIdPrefix={REQUEST_TYPES.EXPENSE}
                    costCenters={costCenters}
                    projects={projects}
                    selectedCostCenter={selectedCostCenter}
                    setSelectedCostCenter={setSelectedCostCenter}
                    expenseCatalogueData={expenseCatalogueData}
                  />
                </>
              ) : (
                <PlanFormContent form={form} planData={planData} onPlanSelect={handlePlanSelect} />
              )}
            </>
          ) : (
            <ExpenseFormContent
              form={form}
              showTransportation={showTransportation}
              setFormIsValid={setFormIsValid}
              testIdPrefix={REQUEST_TYPES.EXPENSE}
              costCenters={costCenters}
              projects={projects}
              selectedCostCenter={selectedCostCenter}
              setSelectedCostCenter={setSelectedCostCenter}
              expenseCatalogueData={expenseCatalogueData}
            />
          )}

          {/* Footer with divider and action buttons - hide when selecting a plan */}
          {!(step === FORM_STEPS.PLAN && !selectedPlan) && (
            <FormFooter
              step={selectedPlan ? REQUEST_TYPES.EXPENSE : step}
              loading={loading}
              formIsValid={formIsValid}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
              testIdPrefix={REQUEST_TYPES.EXPENSE}
              additionalData={additionalData}
            />
          )}
        </>
      ) : (
        <>
          {/* Header */}
          <div
            className="gba:flex gba:items-center"
            style={{
              paddingTop: '40px',
              paddingBottom: '30px',
              height: '2rem',
              boxSizing: 'content-box',
              position: 'relative',
              fontFamily: "'Roboto', sans-serif",
              marginBottom: '16px'
            }}
            data-testid="expense-request-header-container"
          >
            <FormHeaderTitle
              title={expenseRequestStartTitle}
              titleContainerTestId="expense-request-title-container"
              headerTitleTestId="expense-request-header-title"
            />
          </div>
          <Divider style={{ margin: '0 0 30px 0' }} data-testid="expense-request-header-divider" />

          <div className="gba:flex gba:flex-col gba:flex-grow" data-testid="expense-request-start-content">
            {isStartStepConditionsLoading ? (
              <div
                className="gba:flex gba:items-center gba:justify-center gba:flex-grow"
                style={{ minHeight: '200px' }}
                data-testid="expense-request-start-loading"
              >
                <Spinner size="lg" />
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                data-testid="expense-request-form"
                className="gba:flex gba:flex-col gba:flex-grow"
              >
                {/* Without Plan Section */}
                <div data-testid="expense-request-without-plan-section">
                  <p
                    style={{
                      fontFamily: "'Roboto', sans-serif",
                      fontSize: '14px',
                      lineHeight: '16px',
                      fontWeight: 600,
                      marginBottom: '16px'
                    }}
                    data-testid="expense-request-without-plan-title"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.not_based_plan_text',
                      'Without Plan'
                    )}
                  </p>

                  {/* Expense Button - Only show if not disabled */}
                  {!isExpenseDisabled && (
                    <div className="gba:bg-muted gba:rounded gba:mb-4">
                      <Button
                        variant="ghost"
                        style={{
                          height: '96px',
                          width: '100%',
                          padding: '0 24px'
                        }}
                        data-testid="expense-request-expense-button"
                        onClick={handleExpenseClick}
                      >
                        <div className="gba:flex gba:justify-between gba:items-center" style={{ width: '100%' }}>
                          <div className="gba:flex gba:items-center">
                            <img
                              src={ICONS.RECEIPT_ICON}
                              alt="Receipt"
                              style={{ marginRight: '16px' }}
                              width="32"
                              height="32"
                              data-testid="expense-request-receipt-icon"
                            />
                            <span
                              style={{
                                fontFamily: "'Roboto', sans-serif",
                                fontSize: '18px',
                                lineHeight: '20px',
                                fontWeight: 600
                              }}
                              data-testid="expense-request-expense-text"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:create_expense_request.expense_select_button',
                                'Expense'
                              )}
                            </span>
                          </div>
                          <img
                            src={ICONS.RIGHT_ARROW}
                            alt="Arrow"
                            style={{ width: '24px', height: '24px' }}
                            data-testid="expense-request-expense-arrow"
                          />
                        </div>
                      </Button>
                    </div>
                  )}

                  {/* Trip Button - Only show if not disabled */}
                  {!isTripDisabled && (
                    <div className="gba:bg-muted gba:rounded gba:mb-4">
                      <Button
                        variant="ghost"
                        style={{
                          height: '96px',
                          width: '100%',
                          padding: '0 24px'
                        }}
                        data-testid="expense-request-trip-button"
                        onClick={handleTripClick}
                      >
                        <div className="gba:flex gba:justify-between gba:items-center" style={{ width: '100%' }}>
                          <div className="gba:flex gba:items-center">
                            <img
                              src={ICONS.TRIP_ICON}
                              alt="Trip"
                              style={{ marginRight: '16px' }}
                              width="32"
                              height="32"
                              data-testid="expense-request-trip-icon"
                            />
                            <span
                              style={{
                                fontFamily: "'Roboto', sans-serif",
                                fontSize: '18px',
                                lineHeight: '20px',
                                fontWeight: 600
                              }}
                              data-testid="expense-request-trip-text"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:create_expense_request.trip_select_button',
                                'Trip'
                              )}
                            </span>
                          </div>
                          <img
                            src={ICONS.RIGHT_ARROW}
                            alt="Arrow"
                            style={{ width: '24px', height: '24px' }}
                            data-testid="expense-request-trip-arrow"
                          />
                        </div>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Based on Plan Section - Only show if there are plans */}
                {expenseCatalogueData?.ExpensePlan?.length > 0 && (
                  <>
                    {/* Divider */}
                    <Divider style={{ margin: '40px 0px 52px 0px' }} data-testid="expense-request-middle-divider" />

                    <div data-testid="expense-request-with-plan-section">
                      <p
                        style={{
                          fontFamily: "'Roboto', sans-serif",
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: 600,
                          marginBottom: '16px'
                        }}
                        data-testid="expense-request-with-plan-title"
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:create_expense_request.based_plan_text',
                          'Based on Plan'
                        )}
                      </p>

                      {/* Plan Button */}
                      <div className="gba:bg-muted gba:rounded gba:mb-4">
                        <Button
                          variant="ghost"
                          style={{
                            height: '96px',
                            width: '100%',
                            padding: '0 24px'
                          }}
                          data-testid="expense-request-plan-button"
                          onClick={handlePlanClick}
                        >
                          <div className="gba:flex gba:justify-between gba:items-center" style={{ width: '100%' }}>
                            <div className="gba:flex gba:items-center">
                              <img
                                src={ICONS.PLAN_ICON}
                                alt="Plan"
                                style={{ marginRight: '16px' }}
                                width="32"
                                height="32"
                                data-testid="expense-request-plan-icon"
                              />
                              <span
                                style={{
                                  fontFamily: "'Roboto', sans-serif",
                                  fontSize: '18px',
                                  lineHeight: '20px',
                                  fontWeight: 600
                                }}
                                data-testid="expense-request-plan-text"
                              >
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:create_expense_request.plan_select_button',
                                  'My expense plans'
                                )}{' '}
                                ({expenseCatalogueData?.ExpensePlan?.length})
                              </span>
                            </div>
                            <img
                              src={ICONS.RIGHT_ARROW}
                              alt="Arrow"
                              style={{ width: '24px', height: '24px' }}
                              data-testid="expense-request-plan-arrow"
                            />
                          </div>
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Spacer to push content to the top */}
                <div className="gba:flex-grow" data-testid="expense-request-spacer" />
              </Form>
            )}
          </div>

          {/* Footer with divider and action buttons */}
          <FormFooter
            step={step}
            onCancel={handleCancel}
            testIdPrefix={REQUEST_TYPES.EXPENSE}
            additionalData={additionalData}
          />
        </>
      )}
    </div>
  )
}

/**
 * Expense Request component
 * @param props - Business app context props
 * @returns Expense Request component
 */
const ExpenseRequest: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  return (
    <div data-testid="expense-request-wrapper">
      <ExpenseRequestProvider {...props}>
        <ExpenseRequestContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </ExpenseRequestProvider>
    </div>
  )
}

export default ExpenseRequest
