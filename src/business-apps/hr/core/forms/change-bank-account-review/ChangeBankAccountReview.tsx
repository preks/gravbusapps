import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  useTranslation
} from '@newwork/nw-design-system'
import { Landmark, CreditCard, CheckCircle, Globe, DollarSign, Hash, FileText, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useBankAccountReviewData } from './hooks/useBankAccountReviewData'
import { useReviewFormData } from '../../hooks/useReviewFormData'
import { RenderComparisonField, RenderUnchangedField } from '../../components/ReviewFieldRenderer'
import translations from './_i18n'

/**
 * Extended interface for additionalData with form-specific properties
 */
interface ExtendedAdditionalData {
  [k: string]: unknown
  psi_taskCompletedAt?: string
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
}

interface ChangeBankAccountReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface BankAccountData {
  countryRef?: string | null
  currencyRef?: string | null
  bankName?: string | null
  accountType?: string | null
  accountHolder?: string | null
  routingNumberType?: string | null
  accountNumber?: string | null
  routingNumber?: string | null
  employeeAddress?: string | null
  iban?: string | null
  swift?: string | null
  notes?: string | null
}

// Helper functions for US account detection
const getCountryCode = (ref?: string | null): string => {
  return ref?.split(':').pop() || ''
}

const isUSAccount = (countryRef?: string | null): boolean => {
  return getCountryCode(countryRef) === 'US'
}

// Helper: Check if task is completed
const checkIfTaskCompleted = (taskStatus: string, taskCompletedAt: any): boolean => {
  return taskStatus === 'COMPLETED' || !!taskCompletedAt
}

// Helper: Extract employee ID from various sources
const extractEmployeeId = (taskPayload: any, userInfo: any): string | undefined => {
  return taskPayload?.bankAccount?.employeeId || userInfo?.employeeDetails?.employeeId
}

// Helper: Create catalog value formatter
const createCatalogValueFormatter = (catalogMap: Record<string, any>, fallbackText: string) => {
  return (ref?: string | null): string => {
    if (!ref) return fallbackText
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }
}

// Helper: Create account type formatter
const createAccountTypeFormatter = (t: (key: string) => string) => {
  return (type?: string | null): string => {
    if (!type) return t('value-na')
    if (type === 'CHECKINGS') return t('value-checkings')
    if (type === 'SAVINGS') return t('value-savings')
    return type
  }
}

// Helper: Create address type formatter
const createAddressTypeFormatter = (addressTypeMap: Record<string, string>, t: (key: string) => string) => {
  return (addressId?: string | null): string => {
    if (!addressId) return t('value-na')
    const type = addressTypeMap[addressId]
    if (!type || typeof type !== 'string') return t('value-na')
    if (type.toUpperCase() === 'PRIMARY') return t('value-primary')
    if (type.toUpperCase() === 'SECONDARY') return t('value-secondary')
    return type
  }
}

const ChangeBankAccountReviewContent: React.FC<ChangeBankAccountReviewProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  // Translation hook
  const { t } = useTranslation(translations)

  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [isUnchangedExpanded, setIsUnchangedExpanded] = useState(false)

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  const isTaskCompleted = checkIfTaskCompleted(taskStatus, taskCompletedAt)
  const taskTitle = t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Extract bank account data from payload
  const newBankAccount: BankAccountData = taskPayload?.bankAccount || {}
  const oldBankAccount: BankAccountData = taskPayload?.oldBankAccount || {}
  const employeeIdFromPayload = extractEmployeeId(taskPayload, userInfo)

  // Fetch employee and catalog data
  const { employeeData, catalogMap, addressTypeMap, loading, error, refetch } = useBankAccountReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    newBankAccount,
    oldBankAccount
  })

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Create formatters using helper functions
  const getCatalogValue = createCatalogValueFormatter(catalogMap, t('value-na'))
  const formatAccountType = createAccountTypeFormatter(t)
  const formatAddressType = createAddressTypeFormatter(addressTypeMap, t)

  const formatCurrency = (ref?: string | null): string => {
    if (!ref) return t('value-na')
    return catalogMap[ref]?.code || getCatalogValue(ref)
  }

  // Use shared hook for review form data
  const { changesCount, hasOldData, changeMode, isInsertMode, compareField } = useReviewFormData<BankAccountData>({
    newData: newBankAccount,
    oldData: oldBankAccount,
    fields: [
      'countryRef',
      'currencyRef',
      'bankName',
      'accountType',
      'accountHolder',
      'routingNumberType',
      'accountNumber',
      'routingNumber',
      'employeeAddress',
      'iban',
      'swift',
      'notes'
    ],
    formatters: {
      countryRef: getCatalogValue,
      currencyRef: getCatalogValue,
      accountType: formatAccountType,
      routingNumberType: getCatalogValue,
      employeeAddress: formatAddressType
    },
    defaultFormatter: (v: any) => String(v || t('value-na')),
    t
  })

  const hasOldBankAccount = hasOldData

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        acknowledge: 'acknowledged'
      })
    } catch (err) {
      console.error('Error acknowledging bank account change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="change-bank-account-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="change-bank-account-review-error">
        <AlertTitle>{t('error-loading-title')}</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={refetch}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            {t('action-retry')}
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

  // Wrapper functions for US-specific rendering logic
  const renderComparisonFieldWithUSLogic = (
    label: string,
    field: keyof BankAccountData,
    icon?: React.ReactNode,
    formatter?: (val: any) => string,
    showForUS?: boolean,
    showForNonUS?: boolean
  ) => {
    const newIsUS = isUSAccount(newBankAccount.countryRef)
    const oldIsUS = isUSAccount(oldBankAccount.countryRef)

    // Skip field if it doesn't match the required country type
    if (showForUS !== undefined && !showForUS && (newIsUS || oldIsUS)) return null
    if (showForNonUS !== undefined && !showForNonUS && !newIsUS && !oldIsUS) return null

    const comparison = compareField(field, formatter)
    return <RenderComparisonField label={label} comparison={comparison} icon={icon} isNewData={isInsertMode} t={t} />
  }

  const renderUnchangedFieldWithUSLogic = (
    label: string,
    field: keyof BankAccountData,
    icon?: React.ReactNode,
    formatter?: (val: any) => string,
    showForUS?: boolean,
    showForNonUS?: boolean
  ) => {
    const newIsUS = isUSAccount(newBankAccount.countryRef)
    const oldIsUS = isUSAccount(oldBankAccount.countryRef)

    // Skip field if it doesn't match the required country type
    if (showForUS !== undefined && !showForUS && (newIsUS || oldIsUS)) return null
    if (showForNonUS !== undefined && !showForNonUS && !newIsUS && !oldIsUS) return null

    const comparison = compareField(field, formatter)
    if (comparison.changed) return null

    return <RenderUnchangedField label={label} value={comparison.newValue} icon={icon} t={t} />
  }

  return (
    <TaskFormLayout
      data-testid="change-bank-account-review-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={true}
          employeeData={
            employeeData
              ? {
                  displayName,
                  firstName: employeeData.firstName,
                  lastName: employeeData.lastName,
                  avatarUrl: employeeData.pictureThumbnail
                    ? `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
                    : undefined,
                  position: employeeData.employeePosition?.jobPosition?.name
                }
              : undefined
          }
          isLoadingEmployee={loading}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="change-bank-account-review-actions"
            actions={[
              {
                label: t('action-acknowledge'),
                onClick: handleAcknowledge,
                variant: 'default' as const,
                disabled: isAcknowledging,
                loading: isAcknowledging,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      {/* Change Mode Alert */}
      <Alert>
        <FileText className="gba:h-4 gba:w-4" />
        <AlertDescription>
          {(() => {
            if (changeMode === 'INSERT') return t('alert-new-account')
            if (changesCount > 0) return t('alert-update-with-changes', { count: changesCount })
            return t('alert-update-no-changes')
          })()}
        </AlertDescription>
      </Alert>

      {/* Bank Account Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Landmark className="gba:h-5 gba:w-5" />
              {isInsertMode ? t('card-title-new-account') : t('card-title-changes')}
            </CardTitle>
            {!isInsertMode && changesCount > 0 && (
              <Badge variant="warning">{t('badge-changes', { count: changesCount })}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Country and Currency */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonFieldWithUSLogic(
              t('label-country'),
              'countryRef',
              <Globe className="gba:h-4 gba:w-4" />,
              getCatalogValue
            )}
            {renderComparisonFieldWithUSLogic(
              t('label-currency'),
              'currencyRef',
              <DollarSign className="gba:h-4 gba:w-4" />,
              formatCurrency
            )}
          </div>

          <Separator />

          {/* Bank Name and Account Type */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonFieldWithUSLogic(
              t('label-bank-name'),
              'bankName',
              <Landmark className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonFieldWithUSLogic(
              t('label-account-type'),
              'accountType',
              <CreditCard className="gba:h-4 gba:w-4" />,
              formatAccountType
            )}
          </div>

          <Separator />

          {/* Account Holder */}
          {renderComparisonFieldWithUSLogic(t('label-account-holder'), 'accountHolder')}

          {/* US-specific fields */}
          {(isUSAccount(newBankAccount.countryRef) || isUSAccount(oldBankAccount.countryRef)) && (
            <>
              <Separator />
              <div className="gba:space-y-4">
                {renderComparisonFieldWithUSLogic(
                  t('label-routing-number-type'),
                  'routingNumberType',
                  undefined,
                  getCatalogValue,
                  true
                )}
                {renderComparisonFieldWithUSLogic(
                  t('label-account-number'),
                  'accountNumber',
                  <Hash className="gba:h-4 gba:w-4" />,
                  undefined,
                  true
                )}
                {renderComparisonFieldWithUSLogic(
                  t('label-routing-number'),
                  'routingNumber',
                  <Hash className="gba:h-4 gba:w-4" />,
                  undefined,
                  true
                )}
                {renderComparisonFieldWithUSLogic(
                  t('label-address'),
                  'employeeAddress',
                  undefined,
                  formatAddressType,
                  true
                )}
              </div>
            </>
          )}

          {/* Non-US fields */}
          {(!isUSAccount(newBankAccount.countryRef) || !isUSAccount(oldBankAccount.countryRef)) && (
            <>
              <Separator />
              <div className="gba:space-y-4">
                {renderComparisonFieldWithUSLogic(
                  t('label-iban'),
                  'iban',
                  <Hash className="gba:h-4 gba:w-4" />,
                  undefined,
                  false,
                  true
                )}
                {renderComparisonFieldWithUSLogic(
                  t('label-swift'),
                  'swift',
                  <Hash className="gba:h-4 gba:w-4" />,
                  undefined,
                  false,
                  true
                )}
              </div>
            </>
          )}

          {/* Notes - only show if present */}
          {(newBankAccount.notes || oldBankAccount.notes) && (
            <>
              <Separator />
              {renderComparisonFieldWithUSLogic(t('label-notes'), 'notes')}
            </>
          )}
        </CardContent>
      </Card>

      {/* Unchanged Fields - Collapsible Section */}
      {!isInsertMode && hasOldBankAccount && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <CreditCard className="gba:h-5 gba:w-5" />
                    {t('card-title-unchanged')}
                    <Badge variant="secondary" className="gba:ml-2">
                      {t('badge-unchanged')}
                    </Badge>
                  </CardTitle>
                  <ChevronDown
                    className={`gba:h-5 gba:w-5 gba:transition-transform ${
                      isUnchangedExpanded ? 'gba:rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="gba:space-y-4 gba:pt-0">
                {/* Basic Account Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {renderUnchangedFieldWithUSLogic(
                    t('label-country'),
                    'countryRef',
                    <Globe className="gba:h-4 gba:w-4" />,
                    getCatalogValue
                  )}
                  {renderUnchangedFieldWithUSLogic(
                    t('label-currency'),
                    'currencyRef',
                    <DollarSign className="gba:h-4 gba:w-4" />,
                    formatCurrency
                  )}
                </div>

                <Separator />

                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {renderUnchangedFieldWithUSLogic(
                    t('label-bank-name'),
                    'bankName',
                    <Landmark className="gba:h-4 gba:w-4" />
                  )}
                  {renderUnchangedFieldWithUSLogic(
                    t('label-account-type'),
                    'accountType',
                    <CreditCard className="gba:h-4 gba:w-4" />,
                    formatAccountType
                  )}
                </div>

                {/* Account Holder */}
                {renderUnchangedFieldWithUSLogic(t('label-account-holder'), 'accountHolder')}

                <Separator />

                {/* US-specific fields */}
                {(isUSAccount(newBankAccount.countryRef) || isUSAccount(oldBankAccount.countryRef)) && (
                  <div className="gba:space-y-4">
                    {renderUnchangedFieldWithUSLogic(
                      t('label-routing-number-type'),
                      'routingNumberType',
                      undefined,
                      getCatalogValue,
                      true,
                      false
                    )}
                    {renderUnchangedFieldWithUSLogic(
                      t('label-account-number'),
                      'accountNumber',
                      <Hash className="gba:h-4 gba:w-4" />,
                      undefined,
                      true,
                      false
                    )}
                    {renderUnchangedFieldWithUSLogic(
                      t('label-routing-number'),
                      'routingNumber',
                      <Hash className="gba:h-4 gba:w-4" />,
                      undefined,
                      true,
                      false
                    )}
                    {renderUnchangedFieldWithUSLogic(
                      t('label-address'),
                      'employeeAddress',
                      undefined,
                      formatAddressType,
                      true,
                      false
                    )}
                  </div>
                )}

                {/* Non-US fields */}
                {(!isUSAccount(newBankAccount.countryRef) || !isUSAccount(oldBankAccount.countryRef)) && (
                  <div className="gba:space-y-4">
                    {renderUnchangedFieldWithUSLogic(
                      t('label-iban'),
                      'iban',
                      <Hash className="gba:h-4 gba:w-4" />,
                      undefined,
                      false,
                      true
                    )}
                    {renderUnchangedFieldWithUSLogic(
                      t('label-swift'),
                      'swift',
                      <Hash className="gba:h-4 gba:w-4" />,
                      undefined,
                      false,
                      true
                    )}
                  </div>
                )}

                {/* Notes */}
                {!compareField('notes').changed && (newBankAccount.notes || oldBankAccount.notes) && (
                  <>
                    <Separator />
                    {renderUnchangedFieldWithUSLogic(t('label-notes'), 'notes')}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </TaskFormLayout>
  )
}

const ChangeBankAccountReview: React.FC<ChangeBankAccountReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing
  const fallbackAdditionalData = additionalData || {
    psi_taskPayload: {
      bankAccount: {},
      oldBankAccount: {}
    }
  }

  return (
    <div className="gba:h-full" data-testid="change-bank-account-review-wrapper">
      <ChangeBankAccountReviewContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ChangeBankAccountReview
