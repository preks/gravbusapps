import React, { useState, useEffect, useMemo } from 'react'
import { Typography, Input } from 'antd'
import { Button } from '@newwork/gravity-ui-catalog'
import { Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { EVENTS } from '../../utils/constants'
import { ICONS } from '../../utils/icons'

import { SCREEN_NAMES_ENUM } from './constants/constants'
import LoadScreen from '../expense-request-wizard/screens/LoadScreen'

import ProgressIndicator from '../expense-request-wizard/components/ProgressIndicator'

import PlanTripScreen from './screens/PlanTripScreen'
import PlanItemsScreen from './screens/PlanItemsScreen'
import PaymentScreen from './screens/PaymentScreen'
import PlanSummaryScreen from './screens/PlanSummaryScreen'

// Import context provider and hook
import { ExpensePlanWizardProvider, useExpensePlanWizardContext } from './context/ExpensePlanWizardContext'

import { setInitialScreen } from './utils/tripScreenUtils'
import ExpensePlanItem from '../expense-plan-item'
import { PLAN_TYPES } from '../expense-plan/constants/constants'
import { TITLE_MAX_LENGTH } from '../expense-request/constants/constants'
import { createSummaryScreenLogObject } from './utils/summaryScreenUtils'

const { Title } = Typography

/**
 * Expense Plan Wizard Content component
 * @param props - Component props
 * @returns Expense Plan Wizard Content component
 */
const ExpensePlanWizardContent: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo, additionalData }) => {
  const {
    loading,
    expenseRuleError,
    expensePlanData,
    currentTitle,
    setCurrentTitle,
    isFormValid,
    setCurrentCurrency,
    showExpenseItem,
    expenseItemParams,
    hideExpenseItem,
    setRequestAdvancePayment,
    refetchExpenseData
  } = useExpensePlanWizardContext()
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES_ENUM.LOAD_TAB)
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [titleValue, setTitleValue] = useState<string>('')
  const [titleError, setTitleError] = useState<string>('')
  const [showCustomFooter, setShowCustomFooter] = useState<boolean>(false)
  const [itemsCount, setItemsCount] = useState<number>(0)
  const [selectedItemCount, setSelectedItemCount] = useState<number>(0)
  const [isNextLoading, setIsNextLoading] = useState<boolean>(false)
  const previousScreenRef = React.useRef<string>(currentScreen)
  const isTrip = expensePlanData?.ExpensePlanByPk?.requestTypeRef?.toLowerCase().includes(PLAN_TYPES.TRIP)
  // Update title and titleValue when expensePlanData changes
  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      setCurrentTitle(expensePlanData.ExpensePlanByPk.title || '')
      setTitleValue(expensePlanData.ExpensePlanByPk.title || '')
    }
  }, [expensePlanData, setCurrentTitle, additionalData])

  const handleCancel = useMemo(() => {
    return () => {
      const logObject = createSummaryScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        expensePlanData.ExpensePlanByPk?.expenseRuleId,
        currentTitle,
        expensePlanData,
        EVENTS.DISCARD,
        false,
        false // Default to false for cancel
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.DISCARD, {
        event: EVENTS.DISCARD,
        pso_completeNotification: {
          type: 'error',
          messageKey: getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_module.toast_notification_cancel_create_absence',
            'The action has been canceled.'
          )
        },
        expensePlan: logObject.expensePlan,
        expensePlanItems: logObject.expensePlanItems,
        expenseRequestTrips: logObject.expensePlanTrips,
        advancePayment: logObject.advancePayment
      })
    }
  }, [expensePlanData?.ExpensePlanByPk])

  // Update currency when expensePlanData changes: prefer plan currency, fallback to item currency
  useEffect(() => {
    const planCurrency = expensePlanData?.ExpensePlanByPk?.currencyRef || expensePlanData?.ExpensePlanByPk?.currency?.id

    if (planCurrency) {
      setCurrentCurrency(planCurrency)
      return
    }

    if (expensePlanData?.ExpensePlanItem && expensePlanData.ExpensePlanItem.length > 0) {
      const firstItem = expensePlanData.ExpensePlanItem[0]
      setCurrentCurrency(firstItem?.currencyRef || null)
    } else {
      setCurrentCurrency(null)
    }
  }, [
    expensePlanData?.ExpensePlanByPk?.currencyRef,
    expensePlanData?.ExpensePlanByPk?.currency?.id,
    expensePlanData?.ExpensePlanItem
  ])

  useEffect(() => {
    const handleFooterUpdate = (event: any) => {
      if (event.detail) {
        if (typeof event.detail.showCustomFooter === 'boolean') {
          setShowCustomFooter(event.detail.showCustomFooter)
        }
        if (typeof event.detail.selectedItemCount === 'number') {
          setSelectedItemCount(event.detail.selectedItemCount)
        }
        if (typeof event.detail.itemsCount === 'number') {
          setItemsCount(event.detail.itemsCount)
        }
      }
    }

    document.addEventListener('expense-plan-wizard-update-footer', handleFooterUpdate)

    return () => {
      document.removeEventListener('expense-plan-wizard-update-footer', handleFooterUpdate)
    }
  }, [additionalData])

  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_title_custom_rule',
        'Please enter a title'
      )
    }
    if (value.length > TITLE_MAX_LENGTH) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.maximum_characters_title_error_message',
        'Maximum limit reached: The title can be up to 50 characters only.'
      )
    }
    return ''
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitleValue(value)
    setTitleError(validateTitle(value))
  }

  const startEditingTitle = () => {
    setIsEditingTitle(true)
  }

  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setTitleValue(expensePlanData?.ExpensePlanByPk?.title || '')
    setTitleError('')
  }

  // Additional useEffect for title initialization
  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      const initialTitle = expensePlanData.ExpensePlanByPk.title || ''
      setCurrentTitle(initialTitle)
      setTitleValue(initialTitle)
    }
  }, [expensePlanData, setCurrentTitle, additionalData])

  const saveTitle = () => {
    setCurrentTitle(titleValue)
    setIsEditingTitle(false)
  }

  // useEffect for initial screen setup ONLY
  const hasInitializedRef = React.useRef(false)
  useEffect(() => {
    if (!loading && expensePlanData && !hasInitializedRef.current) {
      setInitialScreen(
        additionalData,
        expensePlanData,
        isTrip,
        setCurrentScreen,
        setRequestAdvancePayment,
        currentScreen
      )
      hasInitializedRef.current = true
    }
  }, [loading, expensePlanData])

  // Clear next-button loading when screen actually changes (data loaded and navigated)
  useEffect(() => {
    if (previousScreenRef.current !== currentScreen && isNextLoading) {
      setIsNextLoading(false)
    }
    previousScreenRef.current = currentScreen
  }, [currentScreen, isNextLoading])

  // Safety: clear next loading after 30s in case the action fails and screen never changes
  useEffect(() => {
    if (!isNextLoading) return
    const timeoutId = globalThis.setTimeout(() => setIsNextLoading(false), 30000)
    return () => globalThis.clearTimeout(timeoutId)
  }, [isNextLoading])

  // Listen for process events (Next/Back button clicks) to navigate
  useEffect(() => {
    if (hasInitializedRef.current && expensePlanData) {
      setInitialScreen(
        additionalData,
        expensePlanData,
        isTrip,
        setCurrentScreen,
        setRequestAdvancePayment,
        currentScreen
      )
    }
  }, [additionalData])

  const navigateToNextScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        if (!isTrip) {
          refetchExpenseData() // Refetch data before showing summary
          setCurrentScreen(SCREEN_NAMES_ENUM.SUMMARY_TAB)
        } else {
          setCurrentScreen(SCREEN_NAMES_ENUM.PAYMENT_TAB)
        }
        break
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        break
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        break
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        refetchExpenseData() // Refetch data before showing summary
        setCurrentScreen(SCREEN_NAMES_ENUM.SUMMARY_TAB)
        break
      default:
        break
    }
  }

  const navigateToPreviousScreen = () => {
    let skipStep = false
    if (additionalData?.psi_taskPayload?.stepKey && additionalData?.psi_taskPayload?.stepKey.includes(EVENTS.SKIP)) {
      skipStep = true
    }
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        break
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        break
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.TRIPS_TAB)
        break
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        if (isTrip) {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        } else {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        }
        break
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        if (!skipStep) setCurrentScreen(SCREEN_NAMES_ENUM.PAYMENT_TAB)
        else setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        break
      default:
        break
    }
  }

  const shouldShowBackButton = () => {
    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && isTrip) {
      return false
    }
    if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip) {
      return false
    }
    return true
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.LOAD_TAB:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return (
          <PlanItemsScreen
            isTrip={isTrip}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
          />
        )
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return <PlanTripScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        return <PaymentScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return <PlanSummaryScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      default:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center"
        style={{ width: '100%', height: '100%' }}
        data-testid="expense-plan-wizard-loading"
      >
        <img
          src={ICONS.SPINNER_ICON}
          alt="Loading"
          className="gba:w-20 gba:h-20"
          data-testid="expense-plan-wizard-spinner-icon"
        />
      </div>
    )
  }

  if (showExpenseItem) {
    return (
      <ExpensePlanItem
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={{
          ...expenseItemParams
          // DO NOT pass psi_taskPayload - prevents ExpensePlanItem from dispatching process events
        }}
        onClose={hideExpenseItem}
      />
    )
  }

  return (
    <div
      className="gba:mx-auto gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px', minHeight: 'calc(100vh - 10px)', fontFamily: "'Roboto', sans-serif" }}
      data-testid="expense-plan-wizard-content"
    >
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
        data-testid="expense-plan-wizard-header"
      >
        <div
          style={{ position: 'absolute', left: 0, zIndex: 1 }}
          data-testid="expense-plan-wizard-back-button-container"
        >
          {shouldShowBackButton() && (
            <Button
              variant="text"
              style={{ padding: '0', height: 'auto', minWidth: 'auto' }}
              data-testid="expense-plan-wizard-back-button"
              onClick={navigateToPreviousScreen}
            >
              <img
                src={ICONS.BACK_ARROW}
                alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.back_text', 'Back')}
                style={{ width: '24px', height: '24px' }}
                width="24"
                height="24"
                data-testid="back-button-icon"
              />
            </Button>
          )}
        </div>
        <div
          className="gba:flex gba:flex-row gba:items-center gba:justify-center"
          style={{ width: '100%', pointerEvents: 'none' }}
          data-testid="expense-plan-wizard-header-title-wrapper"
        >
          <div
            className="gba:flex gba:flex-col gba:items-center"
            style={{ marginTop: '16px', width: '100%', pointerEvents: 'none' }}
            data-testid="expense-plan-wizard-title-container"
          >
            {isEditingTitle ? (
              <div
                className="gba:flex gba:flex-col gba:items-center"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  margin: '0 auto',
                  pointerEvents: 'auto',
                  zIndex: 100,
                  position: 'relative'
                }}
                data-testid="expense-plan-wizard-editing-title-container"
              >
                <div
                  style={{ width: '100%', pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
                  data-testid="expense-plan-wizard-title-input-wrapper"
                >
                  <Input
                    style={{
                      border: 'none',
                      borderBottom: '1px solid #d9d9d9',
                      borderRadius: 0,
                      padding: '4px 0',
                      textAlign: 'center',
                      fontSize: '20px',
                      width: '100%',
                      backgroundColor: 'transparent',
                      pointerEvents: 'auto',
                      zIndex: 100,
                      position: 'relative',
                      boxShadow: 'none'
                    }}
                    data-testid="expense-plan-wizard-title-input"
                    value={titleValue}
                    onChange={handleTitleChange}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_plan.title_placeholder',
                      'Enter title'
                    )}
                    maxLength={TITLE_MAX_LENGTH}
                    autoFocus
                  />
                </div>
                <div
                  className="gba:flex gba:flex-row gba:justify-end"
                  style={{ marginTop: '8px', pointerEvents: 'auto', zIndex: 100, position: 'relative', width: '100%' }}
                  data-testid="expense-plan-wizard-title-edit-buttons"
                >
                  <div
                    style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative', margin: '0 4px' }}
                    data-testid="expense-plan-wizard-save-button-wrapper"
                  >
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-plan-wizard-title-save-button"
                      onClick={saveTitle}
                      disabled={!!titleError || !titleValue.trim()}
                    >
                      <img
                        src={ICONS.CHECK_ICON}
                        alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.save_btn', 'Save')}
                        width="20"
                        height="20"
                        data-testid="title-save-button-icon"
                      />
                    </Button>
                  </div>
                  <div
                    style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative', margin: '0 4px' }}
                    data-testid="expense-plan-wizard-cancel-button-wrapper"
                  >
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-plan-wizard-title-cancel-button"
                      onClick={cancelEditingTitle}
                    >
                      <img
                        src={ICONS.X_ICON}
                        alt={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:add_items_to_plan.cancel_items_button',
                          'Cancel'
                        )}
                        width="20"
                        height="20"
                        data-testid="title-cancel-button-icon"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="gba:flex gba:flex-row gba:items-center gba:justify-center"
                data-testid="expense-plan-wizard-display-title-container"
              >
                <Title
                  level={4}
                  style={{ margin: 0, textAlign: 'center', pointerEvents: 'auto' }}
                  data-testid="expense-plan-wizard-title"
                >
                  {currentTitle || ''}
                </Title>
                <div
                  style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
                  data-testid="expense-plan-wizard-edit-button-wrapper"
                >
                  <Button
                    variant="text"
                    size="small"
                    data-testid="expense-plan-wizard-title-edit-button"
                    onClick={startEditingTitle}
                    style={{
                      marginLeft: '8px',
                      zIndex: 10,
                      position: 'relative',
                      cursor: 'pointer',
                      pointerEvents: 'auto'
                    }}
                  >
                    <img
                      src={ICONS.EDIT_ICON}
                      alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.back_text', 'Edit')}
                      width="20"
                      height="20"
                      data-testid="edit-title-button-icon"
                    />
                  </Button>
                </div>
              </div>
            )}
            <div
              style={{ fontSize: '14px', fontWeight: 600, textAlign: 'center', marginTop: '4px' }}
              data-testid="expense-plan-wizard-subtitle"
            >
              {currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB &&
                getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.subtitle', 'Expenses')}
              {currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB &&
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_items_to_plan.add_trip_info_to_plan.title',
                  'Trip Details'
                )}
              {currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB &&
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_request.advance_payment',
                  'Advance Payment'
                )}
              {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB &&
                getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.summary', 'Summary')}
            </div>
          </div>
        </div>
      </div>
      <ProgressIndicator isPlan={true} currentScreen={currentScreen} isTrip={isTrip} />

      {/* Main content container with responsive height */}
      <div
        data-testid="expense-plan-wizard-content-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: '50vh'
        }}
      >
        {loading ? (
          <div
            className="gba:flex gba:justify-center gba:items-center"
            style={{ height: '100%' }}
            data-testid="expense-plan-wizard-loading"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
          </div>
        ) : expenseRuleError ? (
          <div
            className="gba:bg-destructive-secondary gba:p-6 gba:rounded gba:mb-8"
            data-testid="expense-plan-wizard-error-container"
          >
            <h3
              className="gba:text-sm gba:font-bold gba:text-destructive gba:mb-2"
              data-testid="expense-plan-wizard-error-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_plan.invalid_profile_title',
                'Validation Issue'
              )}
            </h3>
            <p
              className="gba:text-sm gba:text-muted-foreground gba:m-0"
              data-testid="expense-plan-wizard-error-message"
            >
              {expenseRuleError}
            </p>
          </div>
        ) : (
          <div
            className="gba:flex gba:flex-col"
            data-testid="expense-plan-wizard-screen-container"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: '50vh'
            }}
          >
            {renderCurrentScreen()}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', width: '100%' }} data-testid="expense-plan-wizard-footer">
        <hr style={{ margin: '16px 0' }} data-testid="expense-plan-wizard-bottom-divider" />
        <div
          className="gba:flex gba:justify-between"
          style={{ padding: '16px 0' }}
          data-testid="expense-plan-wizard-actions"
        >
          {showCustomFooter ? (
            <>
              <Button
                variant="outline"
                style={{
                  minWidth: '100px',
                  borderWidth: '2px',
                  fontSize: '16px',
                  fontWeight: 600,
                  height: '40px',
                  padding: '0px 16px',
                  borderRadius: '22px'
                }}
                data-testid="expense-plan-wizard-cancel-selection-button"
                onClick={() => {
                  const cancelEvent = new CustomEvent('expense-plan-items-cancel-selection')
                  document.dispatchEvent(cancelEvent)
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.btn_cancel', 'Cancel')}
              </Button>
              <div className="gba:flex" style={{ gap: '12px' }}>
                <Button
                  variant="primary"
                  style={{
                    minWidth: '100px',
                    borderWidth: '2px',
                    fontSize: '16px',
                    fontWeight: 600,
                    height: '40px',
                    padding: '0px 16px',
                    borderRadius: '22px'
                  }}
                  data-testid="expense-plan-wizard-confirm-selection-button"
                  disabled={selectedItemCount === 0}
                  onClick={() => {
                    const confirmEvent = new CustomEvent('expense-plan-items-confirm-selection')
                    document.dispatchEvent(confirmEvent)
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.btn_items_submit', 'Confirm')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                style={{
                  minWidth: '100px',
                  borderWidth: '2px',
                  fontSize: '16px',
                  fontWeight: 600,
                  height: '40px',
                  padding: '0px 16px',
                  borderRadius: '22px'
                }}
                data-testid="expense-plan-wizard-cancel-button"
                onClick={handleCancel}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.cancel_items_button', 'Cancel')}
              </Button>
              <div className="gba:flex" style={{ gap: '12px' }}>
                <Button
                  variant="outline"
                  style={{
                    minWidth: '100px',
                    borderWidth: '2px',
                    fontSize: '16px',
                    fontWeight: 600,
                    height: '40px',
                    padding: '0px 16px',
                    borderRadius: '22px',
                    width: 'auto'
                  }}
                  data-testid="expense-plan-wizard-save-button"
                  disabled={currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip && itemsCount === 0}
                  onClick={() => {
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-trip')
                      document.dispatchEvent(saveEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-items')
                      document.dispatchEvent(saveEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-payment')
                      document.dispatchEvent(saveEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-summary')
                      document.dispatchEvent(saveEvent)
                    } else {
                      // Default save action for other screens
                    }
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.save_button', 'Save')}
                </Button>
                <Button
                  variant="primary"
                  style={{
                    minWidth: '100px',
                    borderWidth: '2px',
                    fontSize: '16px',
                    fontWeight: 600,
                    height: '40px',
                    padding: '0px 16px',
                    borderRadius: '22px',
                    width: 'auto'
                  }}
                  data-testid="expense-plan-wizard-next-button"
                  disabled={
                    isNextLoading ||
                    (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip && itemsCount === 0) ||
                    (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB && false) // TODO: Add validation logic
                  }
                  onClick={() => {
                    const isNextScreen =
                      currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB ||
                      currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB ||
                      currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB
                    const isSubmitScreen = currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB
                    if (isNextScreen || isSubmitScreen) {
                      setIsNextLoading(true)
                    }
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-trip')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-items')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-payment')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      const submitEvent = new CustomEvent('expense-plan-submit-summary')
                      document.dispatchEvent(submitEvent)
                    } else {
                      navigateToNextScreen()
                    }
                  }}
                >
                  {(() => {
                    if (isNextLoading) {
                      const submitLabel = getTranslationFromI18nKeyAndLabel(
                        'lowcoder:modify_expense_request.btn_submit',
                        'Submit'
                      )
                      const nextLabel = getTranslationFromI18nKeyAndLabel(
                        'lowcoder:add_items_to_plan.submit_button',
                        'Next'
                      )
                      return (
                        <span className="gba:inline-flex gba:items-center gba:gap-2">
                          <Spinner size="sm" />
                          {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB ? submitLabel : nextLabel}
                        </span>
                      )
                    }
                    if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      return getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_submit', 'Submit')
                    }
                    return getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.submit_button', 'Next')
                  })()}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Expense Plan Wizard component
 * @param props - Business app context props
 * @returns Expense Plan Wizard component
 */
const ExpensePlanWizard: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  return (
    <ExpensePlanWizardProvider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
      <div className="gba:flex gba:flex-col" style={{ height: '100%' }} data-testid="expense-plan-wizard-wrapper">
        <ExpensePlanWizardContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </div>
    </ExpensePlanWizardProvider>
  )
}

export default ExpensePlanWizard
