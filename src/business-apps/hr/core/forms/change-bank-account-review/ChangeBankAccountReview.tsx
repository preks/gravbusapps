import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  Label,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Landmark,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Globe,
  DollarSign,
  Hash,
  FileText,
  ChevronDown
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useBankAccountReviewData } from './hooks/useBankAccountReviewData'
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
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Extract bank account data from payload
  const newBankAccount: BankAccountData = taskPayload?.bankAccount || {}
  const oldBankAccount: BankAccountData = taskPayload?.oldBankAccount || {}
  const employeeIdFromPayload: string | undefined =
    taskPayload?.bankAccount?.employeeId || userInfo?.employeeDetails?.employeeId

  // Fetch employee and catalog data
  const { employeeData, catalogMap, addressTypeMap, loading, error, refetch } = useBankAccountReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    newBankAccount,
    oldBankAccount
  })

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Helper: check if old bank account exists
  const hasOldBankAccount = Boolean(
    oldBankAccount?.bankName || oldBankAccount?.accountHolder || oldBankAccount?.accountNumber || oldBankAccount?.iban
  )

  const changeMode = hasOldBankAccount ? 'UPDATE' : 'INSERT'
  const isInsertMode = changeMode === 'INSERT'

  // Count total changes - MUST BE BEFORE CONDITIONAL RETURNS
  const changesCount = useMemo(() => {
    if (!hasOldBankAccount) return 0

    const fields: (keyof BankAccountData)[] = [
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
    ]

    const compareField = (newVal: any, oldVal: any): boolean => {
      const format = (v: any) => String(v || 'N/A')
      return format(newVal) !== format(oldVal)
    }

    return fields.reduce((count, field) => {
      return compareField(newBankAccount[field], oldBankAccount[field]) ? count + 1 : count
    }, 0)
  }, [newBankAccount, oldBankAccount, hasOldBankAccount])

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

  // Helper functions
  const getCatalogValue = (ref?: string | null): string => {
    if (!ref) return t('value-na')
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref

    // Use translation if available, otherwise use default value
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }

  const formatAccountType = (type?: string | null): string => {
    if (!type) return t('value-na')
    if (type === 'CHECKINGS') return t('value-checkings')
    if (type === 'SAVINGS') return t('value-savings')
    return type
  }

  const formatAddressType = (addressId?: string | null): string => {
    if (!addressId) return t('value-na')
    const type = addressTypeMap[addressId]
    if (!type) return t('value-na')
    if (type.toUpperCase() === 'PRIMARY') return t('value-primary')
    if (type.toUpperCase() === 'SECONDARY') return t('value-secondary')
    return type
  }

  const getCountryCode = (ref?: string | null): string => {
    return ref?.split(':').pop() || ''
  }

  const isUSAccount = (countryRef?: string | null): boolean => {
    return getCountryCode(countryRef) === 'US'
  }

  // Field comparison
  interface FieldComparison {
    changed: boolean
    oldValue: string
    newValue: string
  }

  const compareField = (newVal: any, oldVal: any, formatter?: (val: any) => string): FieldComparison => {
    const format = formatter || ((v: any) => String(v || 'N/A'))
    const newFormatted = format(newVal)
    const oldFormatted = format(oldVal)

    return {
      changed: newFormatted !== oldFormatted,
      oldValue: oldFormatted,
      newValue: newFormatted
    }
  }

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

  // Render comparison field - Show ONLY changed fields with old → new
  const renderComparisonField = (
    label: string,
    comparison: FieldComparison,
    icon?: React.ReactNode,
    showForUS?: boolean,
    showForNonUS?: boolean
  ) => {
    const newIsUS = isUSAccount(newBankAccount.countryRef)
    const oldIsUS = isUSAccount(oldBankAccount.countryRef)

    // Skip field if it doesn't match the required country type
    if (showForUS !== undefined && !showForUS && (newIsUS || oldIsUS)) return null
    if (showForNonUS !== undefined && !showForNonUS && !newIsUS && !oldIsUS) return null

    // Only show changed fields
    if (!comparison.changed) return null

    const isNewAccount = !hasOldBankAccount || changeMode === 'INSERT'
    // Display "Not set" if old value was empty/null/N/A
    const displayOldValue =
      comparison.oldValue === t('value-na') || !comparison.oldValue ? t('value-not-set') : comparison.oldValue

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          <Badge variant={isNewAccount ? 'success' : 'warning'} className="gba:ml-2">
            {isNewAccount ? t('badge-new') : t('badge-changed')}
          </Badge>
        </Label>

        {/* Always show old → new for changed fields */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {!isNewAccount && (
            <>
              <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                {displayOldValue}
              </div>
              <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            </>
          )}
          <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
            {comparison.newValue}
          </div>
        </div>
      </div>
    )
  }

  // Render unchanged field - Show current value for unchanged fields
  const renderUnchangedField = (
    label: string,
    value: string,
    icon?: React.ReactNode,
    showForUS?: boolean,
    showForNonUS?: boolean
  ) => {
    // Skip empty values
    if (!value || value === t('value-na')) return null

    const newIsUS = isUSAccount(newBankAccount.countryRef)
    const oldIsUS = isUSAccount(oldBankAccount.countryRef)

    // Skip field if it doesn't match the required country type
    if (showForUS !== undefined && !showForUS && (newIsUS || oldIsUS)) return null
    if (showForNonUS !== undefined && !showForNonUS && !newIsUS && !oldIsUS) return null

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
        </Label>
        <div className="gba:px-3 gba:py-2 gba:bg-muted gba:rounded gba:text-sm">{value}</div>
      </div>
    )
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
          {changeMode === 'INSERT'
            ? t('alert-new-account')
            : hasOldBankAccount && changesCount > 0
              ? t('alert-update-with-changes', { count: changesCount })
              : t('alert-update-no-changes')}
        </AlertDescription>
      </Alert>

      {/* Bank Account Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Landmark className="gba:h-5 gba:w-5" />
              {changeMode === 'INSERT' ? t('card-title-new-account') : t('card-title-changes')}
            </CardTitle>
            {hasOldBankAccount && changesCount > 0 && (
              <Badge variant="warning">{t('badge-changes', { count: changesCount })}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Country and Currency */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              t('label-country'),
              compareField(newBankAccount.countryRef, oldBankAccount.countryRef, getCatalogValue),
              <Globe className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-currency'),
              compareField(
                newBankAccount.currencyRef,
                oldBankAccount.currencyRef,
                ref => catalogMap[ref || '']?.code || getCatalogValue(ref)
              ),
              <DollarSign className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Bank Name and Account Type */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              t('label-bank-name'),
              compareField(newBankAccount.bankName, oldBankAccount.bankName),
              <Landmark className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-account-type'),
              compareField(newBankAccount.accountType, oldBankAccount.accountType, formatAccountType),
              <CreditCard className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Account Holder */}
          {renderComparisonField(
            t('label-account-holder'),
            compareField(newBankAccount.accountHolder, oldBankAccount.accountHolder)
          )}

          {/* US-specific fields */}
          {(isUSAccount(newBankAccount.countryRef) || isUSAccount(oldBankAccount.countryRef)) && (
            <>
              <Separator />
              <div className="gba:space-y-4">
                {renderComparisonField(
                  t('label-routing-number-type'),
                  compareField(newBankAccount.routingNumberType, oldBankAccount.routingNumberType, getCatalogValue),
                  undefined,
                  true
                )}
                {renderComparisonField(
                  t('label-account-number'),
                  compareField(newBankAccount.accountNumber, oldBankAccount.accountNumber),
                  <Hash className="gba:h-4 gba:w-4" />,
                  true
                )}
                {renderComparisonField(
                  t('label-routing-number'),
                  compareField(newBankAccount.routingNumber, oldBankAccount.routingNumber),
                  <Hash className="gba:h-4 gba:w-4" />,
                  true
                )}
                {renderComparisonField(
                  t('label-address'),
                  compareField(newBankAccount.employeeAddress, oldBankAccount.employeeAddress, formatAddressType),
                  undefined,
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
                {renderComparisonField(
                  t('label-iban'),
                  compareField(newBankAccount.iban, oldBankAccount.iban),
                  <Hash className="gba:h-4 gba:w-4" />,
                  false,
                  true
                )}
                {renderComparisonField(
                  t('label-swift'),
                  compareField(newBankAccount.swift, oldBankAccount.swift),
                  <Hash className="gba:h-4 gba:w-4" />,
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
              {renderComparisonField(t('label-notes'), compareField(newBankAccount.notes, oldBankAccount.notes))}
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
                  {(() => {
                    const comparison = compareField(
                      newBankAccount.countryRef,
                      oldBankAccount.countryRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-country'),
                        comparison.newValue,
                        <Globe className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newBankAccount.currencyRef,
                      oldBankAccount.currencyRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-currency'),
                        comparison.newValue,
                        <DollarSign className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}
                </div>

                <Separator />

                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newBankAccount.bankName, oldBankAccount.bankName)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-bank-name'),
                        comparison.newValue,
                        <Landmark className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newBankAccount.accountType,
                      oldBankAccount.accountType,
                      formatAccountType
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-account-type'),
                        comparison.newValue,
                        <CreditCard className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}
                </div>

                {/* Account Holder */}
                {(() => {
                  const comparison = compareField(newBankAccount.accountHolder, oldBankAccount.accountHolder)
                  return !comparison.changed && renderUnchangedField(t('label-account-holder'), comparison.newValue)
                })()}

                <Separator />

                {/* US-specific fields */}
                {(isUSAccount(newBankAccount.countryRef) || isUSAccount(oldBankAccount.countryRef)) && (
                  <div className="gba:space-y-4">
                    {(() => {
                      const comparison = compareField(
                        newBankAccount.routingNumberType,
                        oldBankAccount.routingNumberType,
                        getCatalogValue
                      )
                      return (
                        !comparison.changed &&
                        renderUnchangedField(
                          t('label-routing-number-type'),
                          comparison.newValue,
                          undefined,
                          true,
                          false
                        )
                      )
                    })()}

                    {(() => {
                      const comparison = compareField(newBankAccount.accountNumber, oldBankAccount.accountNumber)
                      return (
                        !comparison.changed &&
                        renderUnchangedField(
                          t('label-account-number'),
                          comparison.newValue,
                          <Hash className="gba:h-4 gba:w-4" />,
                          true,
                          false
                        )
                      )
                    })()}

                    {(() => {
                      const comparison = compareField(newBankAccount.routingNumber, oldBankAccount.routingNumber)
                      return (
                        !comparison.changed &&
                        renderUnchangedField(
                          t('label-routing-number'),
                          comparison.newValue,
                          <Hash className="gba:h-4 gba:w-4" />,
                          true,
                          false
                        )
                      )
                    })()}

                    {(() => {
                      const comparison = compareField(
                        newBankAccount.employeeAddress,
                        oldBankAccount.employeeAddress,
                        formatAddressType
                      )
                      return (
                        !comparison.changed &&
                        renderUnchangedField(t('label-address'), comparison.newValue, undefined, true, false)
                      )
                    })()}
                  </div>
                )}

                {/* Non-US fields */}
                {!isUSAccount(newBankAccount.countryRef) && !isUSAccount(oldBankAccount.countryRef) && (
                  <div className="gba:space-y-4">
                    {(() => {
                      const comparison = compareField(newBankAccount.iban, oldBankAccount.iban)
                      return (
                        !comparison.changed &&
                        renderUnchangedField(
                          t('label-iban'),
                          comparison.newValue,
                          <Hash className="gba:h-4 gba:w-4" />,
                          false,
                          true
                        )
                      )
                    })()}

                    {(() => {
                      const comparison = compareField(newBankAccount.swift, oldBankAccount.swift)
                      return (
                        !comparison.changed &&
                        renderUnchangedField(
                          t('label-swift'),
                          comparison.newValue,
                          <Hash className="gba:h-4 gba:w-4" />,
                          false,
                          true
                        )
                      )
                    })()}
                  </div>
                )}

                {/* Notes */}
                {(newBankAccount.notes || oldBankAccount.notes) &&
                  (() => {
                    const comparison = compareField(newBankAccount.notes, oldBankAccount.notes)
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          {renderUnchangedField(t('label-notes'), comparison.newValue)}
                        </>
                      )
                    }
                    return null
                  })()}
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
