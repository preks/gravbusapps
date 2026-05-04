import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Typography, Input } from 'antd'
import { Button } from '@newwork/gravity-ui-catalog'
import { Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { EVENTS } from '../../utils/constants'
import { ICONS } from '../../utils/icons'
import { useExpenseRequestDateValidation } from './utils/dateValidationUtils'
import { hasEmployeeOrgchartCostCenter } from '@/business-apps/fin/expenses/common/utils/employeeOrgchartCostCenter'

import { ExpenseRequestWizardProvider, useExpenseRequestWizardContext } from './context/ExpenseRequestWizardContext'
import { SCREEN_NAMES_ENUM } from './constants/constants'

import ItemsScreen from './screens/ItemsScreen'
import CreateItemScreen from './screens/CreateItemScreen'
import TripScreen from './screens/TripScreen'
import LoadScreen from './screens/LoadScreen'
import ExpenseItem from '../expense-item/ExpenseItem'
import AllowanceScreen from './screens/AllowanceScreen'
import SummaryScreen from './screens/SummaryScreen'

import ProgressIndicator from './components/ProgressIndicator'
import { setInitialScreen } from './utils/tripScreenUtils'
import { REQUEST_TYPES } from '../expense-request/constants/constants'
import { createSummaryScreenLogObject } from './utils/summaryScreenUtils'

const { Title } = Typography

/**
 * Expense Request Wizard Content component
 * @param props - Component props
 * @returns Expense Request Wizard Content component
 */
const ExpenseRequestWizardContent: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo, additionalData }) => {
  const {
    loading,
    expenseRuleError,
    expenseRequestData,
    currentTitle,
    setCurrentTitle,
    isFormValid,
    setCurrentCurrency,
    showExpenseItem,
    expenseItemParams,
    hideExpenseItem,
    updateTripFormValidation,
    showSelectItems,
    setShowSelectItems
  } = useExpenseRequestWizardContext()
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES_ENUM.LOAD_TAB)
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const { hasFutureDates } = useExpenseRequestDateValidation()
  const [titleValue, setTitleValue] = useState<string>('')
  const [titleError, setTitleError] = useState<string>('')
  const [showCustomFooter, setShowCustomFooter] = useState<boolean>(false)
  const [itemsCount, setItemsCount] = useState<number>(0)
  const [isNextLoading, setIsNextLoading] = useState<boolean>(false)
  const previousScreenRef = React.useRef<string>(currentScreen)

  /**
   * Intercept com.newwork.process.continue when editing a standalone item embedded in the wizard.
   * The ExpenseItem form dispatches this event to save the item, but it would also close the
   * wizard task. By capturing and stopping it during an edit session, we allow the save to
   * complete while staying inside the wizard, then navigate back to the item list via onClose.
   */
  const isEditingStandaloneItem =
    showExpenseItem && !!expenseItemParams?.psi_taskPayload?.psi_initialParameters?.expenseId
  const isEditingStandaloneItemRef = useRef(isEditingStandaloneItem)
  isEditingStandaloneItemRef.current = isEditingStandaloneItem

  useEffect(() => {
    const interceptProcessContinue = (e: Event) => {
      if (isEditingStandaloneItemRef.current) {
        e.stopImmediatePropagation()
      }
    }

    window.addEventListener('com.newwork.process.continue', interceptProcessContinue, true)
    return () => {
      window.removeEventListener('com.newwork.process.continue', interceptProcessContinue, true)
    }
  }, [])

  /**
   * Sync header title from server only when the loaded request changes (by id).
   * This prevents refetches or context updates for the same request from overwriting
   * a title the user has already edited and confirmed (checkmark) before Save.
   */
  const lastTitleSyncRequestIdRef = React.useRef<string | null>(null)

  const isTrip = expenseRequestData?.ExpenseRequestByPk?.requestTypeRef?.toLowerCase().includes(REQUEST_TYPES.TRIP)

  const missingOrgchartCostCenter = useMemo(
    () => Boolean(expenseRequestData && !hasEmployeeOrgchartCostCenter(expenseRequestData.EmployeePosition)),
    [expenseRequestData]
  )

  const handleCancel = useMemo(() => {
    const initialRequest = expenseRequestData?.ExpenseRequestByPk
    return () => {
      const logObject = createSummaryScreenLogObject(
        initialRequest,
        initialRequest?.expenseRuleId,
        initialRequest?.title,
        expenseRequestData,
        EVENTS.DISCARD
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
        expenseRequest: logObject.expenseRequest,
        expenseRequestItems: logObject.expenseRequestItems,
        expenseRequestTrips: logObject.expenseRequestTrips
      })
    }
  }, [expenseRequestData?.ExpenseRequestByPk])

  // Single source of truth for "when to overwrite title from server": only when request id changes
  useEffect(() => {
    const requestId = expenseRequestData?.ExpenseRequestByPk?.id ?? null
    if (requestId && requestId !== lastTitleSyncRequestIdRef.current) {
      lastTitleSyncRequestIdRef.current = requestId
      const initialTitle = expenseRequestData.ExpenseRequestByPk.title || ''
      setCurrentTitle(initialTitle)
      setTitleValue(initialTitle)
    }
  }, [expenseRequestData, setCurrentTitle, additionalData])

  const [selectedItemCount, setSelectedItemCount] = useState<number>(0)

  useEffect(() => {
    const requestCurrency =
      expenseRequestData?.ExpenseRequestByPk?.currencyRef || expenseRequestData?.ExpenseRequestByPk?.currency?.id

    if (requestCurrency) {
      // Prefer request currency when present
      setCurrentCurrency(requestCurrency)
      return
    }

    // Fallback to first item's currency when request currency is missing
    if (expenseRequestData?.ExpenseItem && expenseRequestData.ExpenseItem.length > 0) {
      const firstItem = expenseRequestData.ExpenseItem[0]
      setCurrentCurrency(firstItem?.currencyRef || null)
    } else {
      setCurrentCurrency(null)
    }
  }, [
    expenseRequestData?.ExpenseRequestByPk?.currencyRef,
    expenseRequestData?.ExpenseRequestByPk?.currency?.id,
    expenseRequestData?.ExpenseItem
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

    document.addEventListener('expense-wizard-update-footer', handleFooterUpdate)

    return () => {
      document.removeEventListener('expense-wizard-update-footer', handleFooterUpdate)
    }
  }, [additionalData])

  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_title_custom_rule',
        'Please enter a title'
      )
    }
    if (value.length > 50) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.maximum_characters_title_error_message',
        'Maximum limit reached: The title can be up to 50 characters only.'
      )
    }
    return ''
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setTitleValue(newValue)
    setTitleError(validateTitle(newValue))
  }

  const startEditingTitle = () => {
    setIsEditingTitle(true)
  }

  const cancelEditingTitle = () => {
    setIsEditingTitle(false)
    setTitleValue(expenseRequestData?.ExpenseRequestByPk?.title || '')
    setTitleError('')
  }

  const saveTitle = () => {
    setCurrentTitle(titleValue.trim())
    setIsEditingTitle(false)
  }

  // useEffect for initial screen setup ONLY
  const hasInitializedRef = React.useRef<boolean>(false)
  useEffect(() => {
    if (!loading && expenseRequestData && !hasInitializedRef.current) {
      setInitialScreen(additionalData, expenseRequestData, isTrip, setCurrentScreen, currentScreen)
      hasInitializedRef.current = true
    }
  }, [loading, expenseRequestData])

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
    if (hasInitializedRef.current && expenseRequestData) {
      setInitialScreen(additionalData, expenseRequestData, isTrip, setCurrentScreen, currentScreen)
    }
  }, [additionalData])

  const navigateToPreviousScreen = () => {
    try {
      const footerResetEvent = new CustomEvent('expense-wizard-update-footer', {
        detail: { showCustomFooter: false, selectedItemCount: 0 }
      })
      document.dispatchEvent(footerResetEvent)
      if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB || currentScreen === SCREEN_NAMES_ENUM.CREATE_ITEM_TAB) {
        const itemsResetEvent = new CustomEvent('expense-items-reset-selection')
        document.dispatchEvent(itemsResetEvent)
      }
    } catch {}
    updateTripFormValidation(true)
    // When on items screen and "select items" sub-view is open, close it instead of going to trip screen
    if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && showSelectItems) {
      setShowSelectItems(false)
      return
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
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        if (isTrip) {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        } else {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        }
        break
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        if (!isTrip) setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB)
        else setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB)
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
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return (
          <ItemsScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} isTrip={isTrip} />
        )
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        return <CreateItemScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return <TripScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.LOAD_TAB:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        return <AllowanceScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return <SummaryScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      default:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
    }
  }

  /**
   * Renders the main content area based on loading and error states
   */
  const renderMainContent = () => {
    if (loading) {
      return (
        <div
          className="gba:flex gba:justify-center gba:items-center"
          style={{ height: '100%' }}
          data-testid="expense-request-wizard-loading"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
        </div>
      )
    }

    if (expenseRuleError) {
      return (
        <div
          style={{
            backgroundColor: 'destructive-secondary',
            padding: '16px 24px',
            borderRadius: '4px',
            marginBottom: '32px'
          }}
          data-testid="expense-request-wizard-error-container"
        >
          <h3
            style={{ fontSize: '14px', fontWeight: 700, color: 'destructive', marginBottom: '8px' }}
            data-testid="expense-request-wizard-error-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.invalid_profile_title',
              'Validation Issue'
            )}
          </h3>
          <p
            style={{ fontSize: '14px', color: 'foreground', margin: 0 }}
            data-testid="expense-request-wizard-error-message"
          >
            {expenseRuleError}
          </p>
        </div>
      )
    }

    return (
      <div
        className="gba:flex gba:flex-col"
        data-testid="expense-request-wizard-screen-container"
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
    )
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center"
        style={{ width: '100%', height: '100%' }}
        data-testid="expense-request-wizard-loading"
      >
        <img
          src={ICONS.SPINNER_ICON}
          alt="Loading"
          className="gba:w-20 gba:h-20"
          data-testid="expense-request-wizard-spinner-icon"
        />
      </div>
    )
  }

  if (showExpenseItem) {
    return (
      <ExpenseItem
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={expenseItemParams}
        onClose={hideExpenseItem}
      />
    )
  }

  return (
    <div
      className="gba:mx-auto gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px', minHeight: 'calc(100vh - 10px)', fontFamily: "'Roboto', sans-serif" }}
      data-testid="expense-request-wizard-content"
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
        data-testid="expense-request-wizard-header"
      >
        <div
          style={{ position: 'absolute', left: 0, zIndex: 1 }}
          data-testid="expense-request-wizard-back-button-container"
        >
          {shouldShowBackButton() && (
            <Button
              variant="text"
              style={{ padding: '0', height: 'auto', minWidth: 'auto' }}
              data-testid="expense-request-wizard-back-button"
              onClick={navigateToPreviousScreen}
            >
              <img
                src={ICONS.BACK_ARROW}
                alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.back_text', 'Back')}
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
          data-testid="expense-request-wizard-header-title-wrapper"
        >
          <div
            className="gba:flex gba:flex-col gba:items-center"
            style={{ marginTop: '16px', width: '100%', pointerEvents: 'none' }}
            data-testid="expense-request-wizard-title-container"
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
                data-testid="expense-request-wizard-editing-title-container"
              >
                <div
                  style={{ width: '100%', pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
                  data-testid="expense-request-wizard-title-input-wrapper"
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
                    data-testid="expense-request-wizard-title-input"
                    value={titleValue}
                    onChange={handleTitleChange}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.title_placeholder',
                      'Enter title'
                    )}
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <div
                  className="gba:flex gba:flex-row gba:justify-end"
                  style={{ marginTop: '8px', pointerEvents: 'auto', zIndex: 100, position: 'relative', width: '100%' }}
                  data-testid="expense-request-wizard-title-edit-buttons"
                >
                  <div
                    style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative', margin: '0 4px' }}
                    data-testid="expense-request-wizard-save-button-wrapper"
                  >
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-request-wizard-title-save-button"
                      onClick={saveTitle}
                      disabled={!!titleError || !titleValue.trim()}
                    >
                      <img
                        src={ICONS.CHECK_ICON}
                        alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.save_btn', 'Save')}
                        width="20"
                        height="20"
                        data-testid="title-save-button-icon"
                      />
                    </Button>
                  </div>
                  <div
                    style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative', margin: '0 4px' }}
                    data-testid="expense-request-wizard-cancel-button-wrapper"
                  >
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-request-wizard-title-cancel-button"
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
                {/* Error message hidden as requested, using disabled button state instead */}
              </div>
            ) : (
              <div
                className="gba:flex gba:flex-row gba:items-center gba:justify-center"
                data-testid="expense-request-wizard-display-title-container"
              >
                <Title
                  level={4}
                  style={{ margin: 0, textAlign: 'center', pointerEvents: 'auto' }}
                  data-testid="expense-request-wizard-title"
                >
                  {currentTitle || ''}
                </Title>
                <div
                  style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
                  data-testid="expense-request-wizard-edit-button-wrapper"
                >
                  <Button
                    variant="text"
                    size="small"
                    data-testid="expense-request-wizard-title-edit-button"
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
                      alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.back_text', 'Edit')}
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
              data-testid="expense-request-wizard-subtitle"
            >
              {currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB &&
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_overview.expense_items.expense_items_title',
                  'Expense Items'
                )}
              {currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB &&
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:add_items_to_plan.add_trip_info_to_plan.title',
                  'Trip Details'
                )}
              {currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB &&
                getTranslationFromI18nKeyAndLabel('lowcoder:cards.allowances', 'Allowances')}
              {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB &&
                getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.summary', 'Summary')}
            </div>
          </div>
        </div>
      </div>
      <ProgressIndicator currentScreen={currentScreen} isTrip={isTrip} />

      {/* Main content container with responsive height */}
      <div
        data-testid="expense-request-wizard-content-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: '50vh'
        }}
      >
        {renderMainContent()}
      </div>

      <div style={{ marginTop: 'auto', width: '100%' }} data-testid="expense-request-wizard-footer">
        <hr style={{ margin: '16px 0' }} data-testid="expense-request-wizard-bottom-divider" />
        <div
          className="gba:flex gba:justify-between"
          style={{ padding: '16px 0' }}
          data-testid="expense-request-wizard-actions"
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
                data-testid="expense-request-wizard-cancel-selection-button"
                onClick={() => {
                  const cancelEvent = new CustomEvent('expense-items-cancel-selection')
                  document.dispatchEvent(cancelEvent)
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_cancel', 'Cancel')}
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
                    borderRadius: '22px',
                    width: 'auto'
                  }}
                  data-testid="expense-request-wizard-confirm-selection-button"
                  disabled={selectedItemCount === 0}
                  onClick={() => {
                    const confirmEvent = new CustomEvent('expense-items-confirm-selection')
                    document.dispatchEvent(confirmEvent)
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_items_submit', 'Confirm')}
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
                data-testid="expense-request-wizard-cancel-button"
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
                  data-testid="expense-request-wizard-save-button"
                  disabled={currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip && itemsCount === 0}
                  onClick={() => {
                    if (titleValue.trim()) {
                      setCurrentTitle(titleValue.trim())
                      setIsEditingTitle(false)
                    }
                    const dispatchSave = () => {
                      if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                        document.dispatchEvent(new CustomEvent('expense-request-save-trip'))
                      } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                        document.dispatchEvent(new CustomEvent('expense-request-save-items'))
                      } else if (currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB) {
                        document.dispatchEvent(new CustomEvent('expense-request-save-allowance'))
                      } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                        document.dispatchEvent(new CustomEvent('expense-request-save-summary'))
                      }
                    }
                    if (titleValue.trim()) {
                      setTimeout(dispatchSave, 0)
                    } else {
                      dispatchSave()
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
                  data-testid="expense-request-wizard-next-button"
                  disabled={
                    isNextLoading ||
                    (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip && itemsCount === 0) ||
                    (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB && (hasFutureDates || missingOrgchartCostCenter))
                  }
                  onClick={() => {
                    const isNextScreen =
                      currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB ||
                      currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB ||
                      currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB
                    const isSubmitScreen = currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB
                    if (isNextScreen || isSubmitScreen) {
                      setIsNextLoading(true)
                    }
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const nextEvent = new CustomEvent('expense-request-next-trip')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const nextEvent = new CustomEvent('expense-request-next-items')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB) {
                      const nextEvent = new CustomEvent('expense-request-next-allowance')
                      document.dispatchEvent(nextEvent)
                    } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      const submitEvent = new CustomEvent('expense-request-submit-summary')
                      document.dispatchEvent(submitEvent)
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
 * Expense Request Wizard component
 * @param props - Business app context props
 * @returns Expense Request Wizard component
 */
const ExpenseRequestWizard: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  return (
    <ExpenseRequestWizardProvider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
      <div className="gba:flex gba:flex-col" style={{ height: '100%' }} data-testid="expense-request-wizard-wrapper">
        <ExpenseRequestWizardContent accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />
      </div>
    </ExpenseRequestWizardProvider>
  )
}

export default ExpenseRequestWizard
