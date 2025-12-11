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
  CollapsibleContent
} from '@newwork/nw-design-system'
import { Landmark, CheckCircle, ArrowRight, Globe, MapPin, FileText, Home, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useAddressReviewData } from './hooks/useAddressReviewData'

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

const ChangeEmployeeAddressReviewContent: React.FC<ChangeEmployeeAddressReviewProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
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
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Review Address Change'
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || (processMetadata?.endpoint ? 'kogito' : 'kogito')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Extract address data from payload
  const newAddress: AddressData = taskPayload?.address || {}
  const oldAddress: AddressData = taskPayload?.oldAddressData || {}
  const changeMode = String(taskPayload?.changeMode || '').toUpperCase()
  const isDeleteMode = changeMode === 'DELETE'
  const isInsertMode = changeMode === 'INSERT'
  const employeeIdFromPayload: string | undefined =
    taskPayload?.address?.employeeId || userInfo?.employeeDetails?.employeeId

  // Fetch employee and catalog data
  const { employeeData, catalogMap, docNameMap, loading, error, refetch } = useAddressReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
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

  // Count total changes - MUST BE BEFORE CONDITIONAL RETURNS
  const changesCount = useMemo(() => {
    if (!hasOldAddress || isInsertMode) return 0

    const fields: (keyof AddressData)[] = [
      'type',
      'postalCode',
      'locality',
      'regionRef',
      'countryRef',
      'poBox',
      'notes',
      'employeeDocument'
    ]

    const compareField = (newVal: unknown, oldVal: unknown): boolean => {
      const format = (v: unknown) => String(v || 'N/A')
      return format(newVal) !== format(oldVal)
    }

    let count = fields.reduce((acc, field) => {
      return compareField(newAddress[field], oldAddress[field]) ? acc + 1 : acc
    }, 0)

    // Check address lines
    for (let i = 0; i < 4; i++) {
      const oldLine = String((oldAddress.addressLine || [])[i] || '').trim()
      const newLine = String((newAddress.addressLine || [])[i] || '').trim()
      if (oldLine !== newLine) count++
    }

    return count
  }, [newAddress, oldAddress, hasOldAddress, isInsertMode])

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
        <AlertTitle>Error Loading Address Data</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={refetch}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  // Helper functions
  const getCatalogValue = (ref?: string | null): string => {
    if (!ref) return 'N/A'
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref

    // Use translation if available, otherwise use default value
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }

  const getCountryCode = (ref?: string | null): string => {
    return ref?.split(':').pop() || ''
  }

  const getPostalLabel = (countryRef?: string | null): string => {
    return getCountryCode(countryRef) === 'US' ? 'ZIP Code' : 'Postal Code'
  }

  const getRegionLabel = (countryRef?: string | null): string => {
    const cc = getCountryCode(countryRef)
    if (cc === 'US') return 'State'
    if (cc === 'RO') return 'County'
    return 'Region'
  }

  const shouldShowRegion = (countryRef?: string | null): boolean => {
    const cc = getCountryCode(countryRef)
    return cc === 'DE' || cc === 'US' || cc === 'RO'
  }

  // Get badge variant based on change mode
  const getChangeModeBadgeVariant = (): 'success' | 'destructive' | 'info' => {
    if (isInsertMode) return 'success'
    if (isDeleteMode) return 'destructive'
    return 'info'
  }

  // Get badge label based on change mode
  const getChangeModeBadgeLabel = (): string => {
    if (isInsertMode) return 'New Address'
    if (isDeleteMode) return 'Delete Address'
    return 'Address Update'
  }

  // Get alert message based on change mode and state
  const getAlertMessage = (): string => {
    if (isInsertMode) {
      return 'This is a new address being added to the employee record.'
    }
    if (isDeleteMode) {
      return 'The selected address was deleted by the employee.'
    }
    if (hasOldAddress && changesCount > 0) {
      return `This is an update with ${changesCount} ${changesCount === 1 ? 'change' : 'changes'} to the existing address. Changed fields are highlighted below.`
    }
    return 'This is an update to an existing address in the employee record.'
  }

  // Get card title based on change mode
  const getCardTitle = (): string => {
    if (isInsertMode) return 'New Address Details'
    if (isDeleteMode) return 'Deleted Address'
    return 'Address Changes'
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
  const renderComparisonField = (label: string, comparison: FieldComparison, icon?: React.ReactNode) => {
    // Only show changed fields
    if (!comparison.changed) return null

    const isNewAddress = !hasOldAddress || isInsertMode
    // Display "Not set" if old value was empty/null/N/A
    const displayOldValue = comparison.oldValue === 'N/A' || !comparison.oldValue ? 'Not set' : comparison.oldValue

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          <Badge variant={isNewAddress ? 'success' : 'warning'} className="gba:ml-2">
            {isNewAddress ? 'New' : 'Changed'}
          </Badge>
        </Label>

        {/* Always show old → new for changed fields */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {!isNewAddress && (
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
  const renderUnchangedField = (label: string, value: string, icon?: React.ReactNode) => {
    // Skip empty values
    if (!value || value === 'N/A') return null

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
      data-testid="change-employee-address-review-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
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
          customBadges={
            <Badge variant={getChangeModeBadgeVariant()} data-testid="address-change-mode-badge">
              {getChangeModeBadgeLabel()}
            </Badge>
          }
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="change-employee-address-review-actions"
            actions={[
              {
                label: 'Acknowledge',
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
              <Badge variant="warning">
                {changesCount} {changesCount === 1 ? 'Change' : 'Changes'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Address Lines */}
          {[0, 1, 2, 3].map(i => {
            const oldLine = String((oldAddress.addressLine || [])[i] || '').trim()
            const newLine = String((newAddress.addressLine || [])[i] || '').trim()
            if (i === 0 || oldLine || newLine) {
              return (
                <React.Fragment key={`address-line-${i}`}>
                  {renderComparisonField(
                    `Address Line ${i + 1}`,
                    compareField(newLine, oldLine),
                    <MapPin className="gba:h-4 gba:w-4" />
                  )}
                </React.Fragment>
              )
            }
            return null
          })}

          <Separator />

          {/* Postal Code */}
          {renderComparisonField(
            getPostalLabel(newAddress.countryRef),
            compareField(newAddress.postalCode, oldAddress.postalCode)
          )}

          {/* City */}
          {renderComparisonField(
            'City',
            compareField(newAddress.locality, oldAddress.locality),
            <Landmark className="gba:h-4 gba:w-4" />
          )}

          {/* Region - Only show if country requires it */}
          {(shouldShowRegion(newAddress.countryRef) || shouldShowRegion(oldAddress.countryRef)) &&
            renderComparisonField(
              getRegionLabel(newAddress.countryRef),
              compareField(newAddress.regionRef, oldAddress.regionRef, getCatalogValue)
            )}

          {/* Country */}
          {renderComparisonField(
            'Country',
            compareField(newAddress.countryRef, oldAddress.countryRef, getCatalogValue),
            <Globe className="gba:h-4 gba:w-4" />
          )}

          {/* PO Box - only if present */}
          {(newAddress.poBox || oldAddress.poBox) &&
            renderComparisonField(
              'PO Box',
              compareField(String(newAddress.poBox || false), String(oldAddress.poBox || false))
            )}

          {/* Notes - only if present */}
          {(newAddress.notes?.trim() || oldAddress.notes?.trim()) && (
            <>
              <Separator />
              {renderComparisonField('Notes', compareField(newAddress.notes, oldAddress.notes))}
            </>
          )}

          {/* Document - only if present */}
          {(newAddress.employeeDocument || oldAddress.employeeDocument) && (
            <>
              <Separator />
              {renderComparisonField(
                'Attachment',
                compareField(
                  docNameMap[String(newAddress.employeeDocument)] ||
                    (newAddress.employeeDocument ? 'New Attachment' : ''),
                  docNameMap[String(oldAddress.employeeDocument)] ||
                    (oldAddress.employeeDocument ? 'Old Attachment' : '')
                )
              )}
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
                    All Other Fields
                    <Badge variant="secondary" className="gba:ml-2">
                      Unchanged
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
                  const comparison = compareField(newLine, oldLine)

                  // Only show if field exists and is NOT changed
                  if ((i === 0 || oldLine || newLine) && !comparison.changed) {
                    return (
                      <React.Fragment key={`unchanged-address-line-${i}`}>
                        {renderUnchangedField(
                          `Address Line ${i + 1}`,
                          newLine || 'Not set',
                          <MapPin className="gba:h-4 gba:w-4" />
                        )}
                      </React.Fragment>
                    )
                  }
                  return null
                })}

                <Separator />

                {/* Postal Code */}
                {(() => {
                  const comparison = compareField(newAddress.postalCode, oldAddress.postalCode)
                  return (
                    !comparison.changed &&
                    renderUnchangedField(getPostalLabel(newAddress.countryRef), comparison.newValue)
                  )
                })()}

                {/* City */}
                {(() => {
                  const comparison = compareField(newAddress.locality, oldAddress.locality)
                  return (
                    !comparison.changed &&
                    renderUnchangedField('City', comparison.newValue, <Landmark className="gba:h-4 gba:w-4" />)
                  )
                })()}

                {/* Region - Only if country requires it */}
                {(shouldShowRegion(newAddress.countryRef) || shouldShowRegion(oldAddress.countryRef)) &&
                  (() => {
                    const comparison = compareField(newAddress.regionRef, oldAddress.regionRef, getCatalogValue)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(getRegionLabel(newAddress.countryRef), comparison.newValue)
                    )
                  })()}

                {/* Country */}
                {(() => {
                  const comparison = compareField(newAddress.countryRef, oldAddress.countryRef, getCatalogValue)
                  return (
                    !comparison.changed &&
                    renderUnchangedField('Country', comparison.newValue, <Globe className="gba:h-4 gba:w-4" />)
                  )
                })()}

                {/* PO Box */}
                {(newAddress.poBox || oldAddress.poBox) &&
                  (() => {
                    const comparison = compareField(
                      String(newAddress.poBox || false),
                      String(oldAddress.poBox || false)
                    )
                    return !comparison.changed && renderUnchangedField('PO Box', comparison.newValue)
                  })()}

                {/* Notes */}
                {(newAddress.notes?.trim() || oldAddress.notes?.trim()) &&
                  (() => {
                    const comparison = compareField(newAddress.notes, oldAddress.notes)
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          {renderUnchangedField('Notes', comparison.newValue)}
                        </>
                      )
                    }
                    return null
                  })()}

                {/* Document */}
                {(newAddress.employeeDocument || oldAddress.employeeDocument) &&
                  (() => {
                    const comparison = compareField(
                      docNameMap[String(newAddress.employeeDocument)] ||
                        (newAddress.employeeDocument ? 'New Attachment' : ''),
                      docNameMap[String(oldAddress.employeeDocument)] ||
                        (oldAddress.employeeDocument ? 'Old Attachment' : '')
                    )
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          {renderUnchangedField('Attachment', comparison.newValue)}
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
