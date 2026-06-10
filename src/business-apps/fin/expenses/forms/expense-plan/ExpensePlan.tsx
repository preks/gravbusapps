import React from 'react'
import { Divider, Form } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { Button } from '@newwork/gravity-ui-catalog'
import { ICONS } from '../../utils/icons'
import { ExpensePlanProvider, useExpensePlanContext } from './context/ExpensePlanContext'
import { FormFooter, ExpenseFormContent, FormHeaderTitle } from './components'
import expensePlanTranslations from './_i18n'

import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'

import { showToast } from '../../utils/notificationUtils'
import { FORM_STEPS, PLAN_TYPES, PLAN_STATUS, DISABLED_FLAG, ABORT_EXIT_STRATEGY } from './constants/constants'
import { EVENTS } from '../../utils/constants'
import { formatDateToISO } from '@/common/utils/windowUtils'
import { getCatalogTypeTransformer } from '../expense-request/utils/planUtils'

interface ExpensePlanContentProps {
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

const ExpensePlanContent: React.FC<ExpensePlanContentProps> = ({ accessToken, userInfo, additionalData }) => {
  const { t } = useTranslation(expensePlanTranslations)
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
  } = useExpensePlanContext()

  const [showTransportation, setShowTransportation] = React.useState(false)
  const [formIsValid, setFormIsValid] = React.useState<boolean>(false)

  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  const isExpenseDisabled = React.useMemo(() => {
    const expenseType = getCatalogTypeTransformer(PLAN_TYPES.EXPENSE, expenseCatalogueData)
    return expenseType?.additionalValue1 === DISABLED_FLAG
  }, [expenseCatalogueData])

  const isTripDisabled = React.useMemo(() => {
    const tripType = getCatalogTypeTransformer(PLAN_TYPES.TRIP, expenseCatalogueData)
    return tripType?.additionalValue1 === DISABLED_FLAG
  }, [expenseCatalogueData])

  /** Show loader on START until catalogue is loaded so request-type visibility (e.g. hide expense for Selgros) is known and no flicker */
  const isStartStepConditionsLoading = React.useMemo(
    () =>
      step === FORM_STEPS.START &&
      (loading || (expenseCatalogueData == null && Boolean(userInfo?.employeeDetails?.employeeId))),
    [step, loading, expenseCatalogueData, userInfo?.employeeDetails?.employeeId]
  )

  const handleExpenseClick = () => {
    setStep(FORM_STEPS.EXPENSE)
  }

  const handleTripClick = () => {
    setShowTransportation(true)
    setStep(FORM_STEPS.TRIP)
  }

  const backButtonClick = () => {
    form.resetFields()
    setShowTransportation(false)
    setStep(FORM_STEPS.START)
  }

  const handleCancel = () => {
    try {
      dispatchProcessContinueEventIfEnabled(EVENTS.ABORT, {
        event: EVENTS.ABORT,
        pso_exitStrategy: ABORT_EXIT_STRATEGY,
        pso_completeNotification: {
          type: 'error',
          messageKey: t('toast-action-canceled')
        }
      })
    } catch {
      showToast(t('error-flows-message'), 'error')
      form.resetFields()
      setStep(FORM_STEPS.START)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await form.validateFields()

      const values = form.getFieldsValue() as ExpenseFormValues

      const employeeId = userInfo?.employeeDetails?.employeeId
      if (!accessToken || !employeeId) {
        showToast(t('error-missing-user-info'), 'error')
        setLoading(false)
        return
      }

      const isTrip = step === FORM_STEPS.TRIP

      const expenseTypeRef =
        (isTrip
          ? getCatalogTypeTransformer(PLAN_TYPES.TRIP, expenseCatalogueData)?.id
          : getCatalogTypeTransformer(PLAN_TYPES.EXPENSE, expenseCatalogueData)?.id) || ''

      // Create submit data with the specified structure
      const submitData = {
        employeeId: employeeId,
        expensePlan: {
          requestTypeRef: expenseTypeRef,
          title: values.title,
          status: PLAN_STATUS.CREATED,
          costCenter: values.costCenter,
          employee: employeeId,
          description: values.comment || '',
          planDate: formatDateToISO(new Date()),
          ...(isTrip &&
            values.transportationMeans && {
              additionalProperties: {
                transportationMeans: values.transportationMeans
              }
            }),
          project: values.project || ''
        },
        event: EVENTS.SUBMIT
      }

      try {
        dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
      } catch {
        showToast(t('error-flows-message'), 'error')
      }

      // if (operationSuccessful) {
      //   setTimeout(()=>{
      //     form.resetFields();
      //   setStep(FORM_STEPS.START);
      //   }, SUBMIT_SUCCESS_RESET_TIMEOUT)
      // }
    } catch {
      showToast(t('error-fields-validation'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="gba:mx-auto gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px', minHeight: 'calc(100vh - 10px)', fontFamily: "'Roboto', sans-serif" }}
      data-testid="expense-plan-main-container"
    >
      {step === FORM_STEPS.EXPENSE || step === FORM_STEPS.TRIP ? (
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
            data-testid="expense-plan-form-header-container"
          >
            <Button
              variant="ghost"
              style={{ padding: '0', marginRight: '16px', border: 'none', background: 'transparent' }}
              onClick={backButtonClick}
              data-testid="expense-plan-form-back-button"
            >
              <img
                src={ICONS.BACK_ARROW}
                style={{ width: '24px', height: '24px' }}
                width="24"
                height="24"
                alt="Back"
                data-testid="expense-plan-form-back-icon"
              />
            </Button>
            <FormHeaderTitle
              title={showTransportation ? t('create-trip-plan-header-title') : t('create-expense-plan-header-title')}
              titleContainerTestId="expense-plan-form-title-container"
              headerTitleTestId="expense-plan-form-header-title"
            />
          </div>
          <Divider style={{ margin: '0 0 30px 0' }} data-testid="expense-plan-form-header-divider" />

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
            translationScope="plan"
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
            translationScope="plan"
          />
        </>
      ) : (
        <>
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
            data-testid="expense-plan-header-container"
          >
            <FormHeaderTitle
              title={t('header-container')}
              titleContainerTestId="expense-plan-title-container"
              headerTitleTestId="expense-plan-header-title"
            />
          </div>
          <Divider style={{ margin: '0 0 30px 0' }} data-testid="expense-plan-header-divider" />

          <div className="gba:flex gba:flex-col gba:flex-grow" data-testid="expense-plan-start-content">
            {isStartStepConditionsLoading ? (
              <div
                className="gba:flex gba:items-center gba:justify-center gba:flex-grow"
                style={{ minHeight: '200px' }}
                data-testid="expense-plan-start-loading"
              >
                <Spinner size="lg" />
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                data-testid="expense-plan-form"
                className="gba:flex gba:flex-col gba:flex-grow"
              >
                <div data-testid="expense-plan-without-plan-section">
                  {!isExpenseDisabled && (
                    <div className="gba:bg-muted gba:rounded gba:mb-4">
                      <Button
                        variant="ghost"
                        style={{
                          height: '96px',
                          width: '100%',
                          padding: '0 24px'
                        }}
                        data-testid="expense-plan-expense-button"
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
                              data-testid="expense-plan-receipt-icon"
                            />
                            <span
                              style={{
                                fontFamily: "'Roboto', sans-serif",
                                fontSize: '18px',
                                lineHeight: '20px',
                                fontWeight: 600
                              }}
                              data-testid="expense-plan-expense-text"
                            >
                              {t('expense-button')}
                            </span>
                          </div>
                          <img
                            src={ICONS.RIGHT_ARROW}
                            alt="Arrow"
                            style={{ width: '24px', height: '24px' }}
                            width="24"
                            height="24"
                            data-testid="expense-plan-expense-arrow"
                          />
                        </div>
                      </Button>
                    </div>
                  )}

                  {!isTripDisabled && (
                    <div className="gba:bg-muted gba:rounded gba:mb-4">
                      <Button
                        variant="ghost"
                        style={{
                          height: '96px',
                          width: '100%',
                          padding: '0 24px'
                        }}
                        data-testid="expense-plan-trip-button"
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
                              data-testid="expense-plan-trip-icon"
                            />
                            <span
                              style={{
                                fontFamily: "'Roboto', sans-serif",
                                fontSize: '18px',
                                lineHeight: '20px',
                                fontWeight: 600
                              }}
                              data-testid="expense-plan-trip-text"
                            >
                              {t('trip-button')}
                            </span>
                          </div>
                          <img
                            src={ICONS.RIGHT_ARROW}
                            alt="Arrow"
                            style={{ width: '24px', height: '24px' }}
                            width="24"
                            height="24"
                            data-testid="expense-plan-trip-arrow"
                          />
                        </div>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="gba:flex-grow" data-testid="expense-plan-spacer" />
              </Form>
            )}
          </div>

          <FormFooter
            step={step}
            onCancel={handleCancel}
            testIdPrefix="expense-plan"
            additionalData={additionalData}
            translationScope="plan"
          />
        </>
      )}
    </div>
  )
}

/**
 * Expense Plan component
 * @param props - Business app context props
 * @returns Expense Plan component
 */
const ExpensePlan: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  return (
    <div data-testid="expense-plan-wrapper">
      <ExpensePlanProvider {...props}>
        <ExpensePlanContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </ExpensePlanProvider>
    </div>
  )
}

export default ExpensePlan
