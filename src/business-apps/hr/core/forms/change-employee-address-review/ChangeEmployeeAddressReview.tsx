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
import { Landmark, CheckCircle, Globe, MapPin, FileText, Home, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useAddressReviewData } from './hooks/useAddressReviewData'
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

interface ChangeEmployeeAddressReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface AddressData {
  type?: string | null
  addressLine?: string[] | null
  poBox?: boolean | null
  postalCode?: string | null
  locality?: string | null
  regionRef?: string | null
  countryRef?: string | null
  notes?: string | null
  employeeDocument?: string | null
}

// Helper functions for country-specific logic
const getCountryCode = (ref?: string | null): string => {
  return ref?.split(':').pop() || ''
}

const shouldShowRegion = (countryRef?: string | null): boolean => {
  const cc = getCountryCode(countryRef)
  return cc === 'DE' || cc === 'US' || cc === 'RO'
}

// Helper: Check if task is completed
const checkIfTaskCompleted = (taskStatus: string, taskCompletedAt: any): boolean => {
  return taskStatus === 'COMPLETED' || !!taskCompletedAt
}

// Helper: Determine change mode flags
const determineChangeMode = (changeMode: string) => {
  const mode = String(changeMode || '').toUpperCase()
  return {
    mode,
    isDeleteMode: mode === 'DELETE',
    isInsertMode: mode === 'INSERT'
  }
}

// Helper: Extract employee ID from payload
// Priority: 1) top-level employeeId, 2) nested in address object
// Note: If both are missing, creatorUserId will be used to lookup employee in the hook
const extractEmployeeId = (taskPayload: any): string | undefined => {
  return taskPayload?.employeeId || taskPayload?.address?.employeeId || undefined
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

// Helper: Create address type formatter
const createAddressTypeFormatter = (t: (key: string) => string) => {
  return (type?: string | null): string => {
    if (!type) return t('value-na')
    const upperType = type.toUpperCase()
    if (upperType === 'PRIMARY') return t('value-primary')
    if (upperType === 'SECONDARY') return t('value-secondary')
    return type
  }
}

const ChangeEmployeeAddressReviewContent: React.FC<ChangeEmployeeAddressReviewProps> = ({
  accessToken,
  additionalData,
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

  // Extract address data from payload
  const newAddress: AddressData = taskPayload?.address || {}
  const oldAddress: AddressData = taskPayload?.oldAddressData || {}
  const { isDeleteMode, isInsertMode } = determineChangeMode(taskPayload?.changeMode)
  const employeeIdFromPayload = extractEmployeeId(taskPayload)

  // Fetch employee and catalog data
  const { employeeData, catalogMap, docNameMap, loading, error, refetch } = useAddressReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    creatorUserId: taskPayload?.creatorUserId, // Pass creator user ID for employee lookup when employeeId is null
    newAddress,
    oldAddress
  })

  // Helper: check if old address exists
  const hasOldAddress = Boolean(
    oldAddress?.addressLine?.some(line => line?.trim()) ||
      oldAddress?.postalCode ||
      oldAddress?.locality ||
      oldAddress?.countryRef
  )

  // Create formatters using helper functions
  const getCatalogValue = createCatalogValueFormatter(catalogMap, t('value-na'))
  const formatAddressType = createAddressTypeFormatter(t)

  const formatPoBox = (poBox?: boolean | null): string => {
    if (poBox === true) return t('value-yes')
    if (poBox === false) return t('value-no')
    return t('value-na')
  }

  const formatDocument = (docId?: string | null): string => {
    if (!docId) return t('value-na')
    return docNameMap[docId] || t('value-na')
  }

  // Use shared hook for review form data (exclude addressLine as it needs special handling)
  const { changesCount: baseChangesCount, compareField } = useReviewFormData<AddressData>({
    newData: newAddress,
    oldData: oldAddress,
    fields: ['type', 'postalCode', 'locality', 'regionRef', 'countryRef', 'poBox', 'notes', 'employeeDocument'],
    formatters: {
      type: formatAddressType,
      regionRef: getCatalogValue,
      countryRef: getCatalogValue,
      poBox: formatPoBox,
      employeeDocument: formatDocument
    },
    defaultFormatter: (v: any) => String(v || t('value-na')),
    t
  })

  // Calculate address line changes separately
  const addressLineChanges = (() => {
    if (!hasOldAddress || isInsertMode) return 0
    let count = 0
    for (let i = 0; i < 4; i++) {
      const oldLine = String((oldAddress.addressLine || [])[i] || '').trim()
      const newLine = String((newAddress.addressLine || [])[i] || '').trim()
      if (oldLine !== newLine) count++
    }
    return count
  })()

  // Total changes including address lines
  const changesCount = baseChangesCount + addressLineChanges

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

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
      console.error('Error acknowledging address change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="change-employee-address-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="change-employee-address-review-error">
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

  // Helper functions using translations
  const getPostalLabel = (countryRef?: string | null): string => {
    return getCountryCode(countryRef) === 'US' ? t('label-zip-code') : t('label-postal-code')
  }

  const getRegionLabel = (countryRef?: string | null): string => {
    const cc = getCountryCode(countryRef)
    if (cc === 'US') return t('label-state')
    if (cc === 'RO') return t('label-county')
    return t('label-region')
  }

  // Get alert message based on change mode and state
  const getAlertMessage = (): string => {
    if (isInsertMode) {
      return t('alert-new-address')
    }
    if (isDeleteMode) {
      return t('alert-delete-address')
    }
    if (hasOldAddress && changesCount > 0) {
      return t('alert-update-with-changes', { count: changesCount })
    }
    return t('alert-update-no-changes')
  }

  // Get card title based on change mode
  const getCardTitle = (): string => {
    if (isInsertMode) return t('card-title-new-address')
    if (isDeleteMode) return t('card-title-delete-address')
    return t('card-title-changes')
  }

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

  // Helper to compare address line values
  const compareAddressLine = (newLine: string, oldLine: string) => {
    const newVal = newLine.trim() || t('value-not-set')
    const oldVal = oldLine.trim() || t('value-not-set')
    return {
      newValue: newVal,
      oldValue: oldVal,
      changed: newVal !== oldVal
    }
  }

  return (
    <TaskFormLayout
      data-testid="change-employee-address-review-container"
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
            data-testid="change-employee-address-review-actions"
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
      <Alert variant={isDeleteMode ? 'destructive' : 'default'}>
        <FileText className="gba:h-4 gba:w-4" />
        <AlertDescription>{getAlertMessage()}</AlertDescription>
      </Alert>

      {/* Address Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Home className="gba:h-5 gba:w-5" />
              {getCardTitle()}
            </CardTitle>
            {hasOldAddress && changesCount > 0 && !isDeleteMode && (
              <Badge variant="warning">{t('badge-changes', { count: changesCount })}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Address Lines */}
          {[0, 1, 2, 3].map(i => {
            const oldLine = String((oldAddress.addressLine || [])[i] || '').trim()
            const newLine = String((newAddress.addressLine || [])[i] || '').trim()
            if (i === 0 || oldLine || newLine) {
              const comparison = compareAddressLine(newLine, oldLine)
              return (
                <React.Fragment key={`address-line-${i}`}>
                  <RenderComparisonField
                    label={t('label-address-line', { number: i + 1 })}
                    comparison={comparison}
                    icon={<MapPin className="gba:h-4 gba:w-4" />}
                    isNewData={isInsertMode}
                    t={t}
                  />
                </React.Fragment>
              )
            }
            return null
          })}

          <Separator />

          {/* Postal Code */}
          <RenderComparisonField
            label={getPostalLabel(newAddress.countryRef)}
            comparison={compareField('postalCode')}
            isNewData={isInsertMode}
            t={t}
          />

          {/* City */}
          <RenderComparisonField
            label={t('label-city')}
            comparison={compareField('locality')}
            icon={<Landmark className="gba:h-4 gba:w-4" />}
            isNewData={isInsertMode}
            t={t}
          />

          {/* Region - Only show if country requires it */}
          {(shouldShowRegion(newAddress.countryRef) || shouldShowRegion(oldAddress.countryRef)) && (
            <RenderComparisonField
              label={getRegionLabel(newAddress.countryRef)}
              comparison={compareField('regionRef', getCatalogValue)}
              isNewData={isInsertMode}
              t={t}
            />
          )}

          {/* Country */}
          <RenderComparisonField
            label={t('label-country')}
            comparison={compareField('countryRef', getCatalogValue)}
            icon={<Globe className="gba:h-4 gba:w-4" />}
            isNewData={isInsertMode}
            t={t}
          />

          {/* PO Box - only if present */}
          {(newAddress.poBox != null || oldAddress.poBox != null) && (
            <RenderComparisonField
              label={t('label-po-box')}
              comparison={compareField('poBox', formatPoBox)}
              isNewData={isInsertMode}
              t={t}
            />
          )}

          {/* Notes - only if present */}
          {(newAddress.notes?.trim() || oldAddress.notes?.trim()) && (
            <>
              <Separator />
              <RenderComparisonField
                label={t('label-notes')}
                comparison={compareField('notes')}
                isNewData={isInsertMode}
                t={t}
              />
            </>
          )}

          {/* Document - only if present */}
          {(newAddress.employeeDocument || oldAddress.employeeDocument) && (
            <>
              <Separator />
              <RenderComparisonField
                label={t('label-attachment')}
                comparison={compareField('employeeDocument', formatDocument)}
                isNewData={isInsertMode}
                t={t}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Unchanged Fields - Collapsible Section */}
      {!isInsertMode && hasOldAddress && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <Home className="gba:h-5 gba:w-5" />
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
                {/* Address Lines */}
                {[0, 1, 2, 3].map(i => {
                  const oldLine = String((oldAddress.addressLine || [])[i] || '').trim()
                  const newLine = String((newAddress.addressLine || [])[i] || '').trim()
                  const comparison = compareAddressLine(newLine, oldLine)

                  // Only show if field exists and is NOT changed
                  if ((i === 0 || oldLine || newLine) && !comparison.changed) {
                    return (
                      <React.Fragment key={`unchanged-address-line-${i}`}>
                        <RenderUnchangedField
                          label={t('label-address-line', { number: i + 1 })}
                          value={comparison.newValue}
                          icon={<MapPin className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      </React.Fragment>
                    )
                  }
                  return null
                })}

                <Separator />

                {/* Postal Code */}
                {(() => {
                  const comparison = compareField('postalCode')
                  return (
                    !comparison.changed && (
                      <RenderUnchangedField
                        label={getPostalLabel(newAddress.countryRef)}
                        value={comparison.newValue}
                        t={t}
                      />
                    )
                  )
                })()}

                {/* City */}
                {(() => {
                  const comparison = compareField('locality')
                  return (
                    !comparison.changed && (
                      <RenderUnchangedField
                        label={t('label-city')}
                        value={comparison.newValue}
                        icon={<Landmark className="gba:h-4 gba:w-4" />}
                        t={t}
                      />
                    )
                  )
                })()}

                {/* Region - Only if country requires it */}
                {(shouldShowRegion(newAddress.countryRef) || shouldShowRegion(oldAddress.countryRef)) &&
                  (() => {
                    const comparison = compareField('regionRef', getCatalogValue)
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={getRegionLabel(newAddress.countryRef)}
                          value={comparison.newValue}
                          t={t}
                        />
                      )
                    )
                  })()}

                {/* Country */}
                {(() => {
                  const comparison = compareField('countryRef', getCatalogValue)
                  return (
                    !comparison.changed && (
                      <RenderUnchangedField
                        label={t('label-country')}
                        value={comparison.newValue}
                        icon={<Globe className="gba:h-4 gba:w-4" />}
                        t={t}
                      />
                    )
                  )
                })()}

                {/* PO Box */}
                {(newAddress.poBox != null || oldAddress.poBox != null) &&
                  (() => {
                    const comparison = compareField('poBox', formatPoBox)
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-po-box')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                {/* Notes */}
                {(newAddress.notes?.trim() || oldAddress.notes?.trim()) &&
                  (() => {
                    const comparison = compareField('notes')
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          <RenderUnchangedField label={t('label-notes')} value={comparison.newValue} t={t} />
                        </>
                      )
                    }
                    return null
                  })()}

                {/* Document */}
                {(newAddress.employeeDocument || oldAddress.employeeDocument) &&
                  (() => {
                    const comparison = compareField('employeeDocument', formatDocument)
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          <RenderUnchangedField label={t('label-attachment')} value={comparison.newValue} t={t} />
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

const ChangeEmployeeAddressReview: React.FC<ChangeEmployeeAddressReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing
  const fallbackAdditionalData = additionalData || {
    psi_taskPayload: {
      address: {},
      oldAddressData: {}
    }
  }

  return (
    <div className="gba:h-full" data-testid="change-employee-address-review-wrapper">
      <ChangeEmployeeAddressReviewContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ChangeEmployeeAddressReview
