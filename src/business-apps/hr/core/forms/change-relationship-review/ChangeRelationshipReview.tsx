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
  Users,
  CheckCircle,
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Shield,
  ChevronDown
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useRelationshipReviewData } from './hooks/useRelationshipReviewData'
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

interface ChangeRelationshipReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface EmployeeRelationshipData {
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  email?: string | null
  notes?: string | null
  typeRef?: string | null
  birthDate?: string | null
  emergencyContact?: boolean | null
  relationshipDocument?: string | null
}

const ChangeRelationshipReviewContent: React.FC<ChangeRelationshipReviewProps> = ({
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

  // Extract relationship data from payload
  const newRelationship: EmployeeRelationshipData = taskPayload?.employeeRelationship || {}
  const oldRelationship: EmployeeRelationshipData = taskPayload?.oldEmployeeRelationship || {}
  const employeeIdFromPayload: string | undefined = taskPayload?.employeeId || userInfo?.employeeDetails?.employeeId

  // Fetch employee and catalog data
  const { employeeData, catalogMap, loading, error, refetch } = useRelationshipReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    newRelationship,
    oldRelationship
  })

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Helper: check if old relationship exists
  const hasOldRelationship = Boolean(
    oldRelationship?.firstName || oldRelationship?.lastName || oldRelationship?.phoneNumber || oldRelationship?.typeRef
  )

  const changeMode = hasOldRelationship ? 'UPDATE' : 'INSERT'
  const isInsertMode = changeMode === 'INSERT'

  // Count total changes - MUST BE BEFORE CONDITIONAL RETURNS
  const changesCount = useMemo(() => {
    if (!hasOldRelationship) return 0

    const fields: (keyof EmployeeRelationshipData)[] = [
      'firstName',
      'lastName',
      'phoneNumber',
      'email',
      'notes',
      'typeRef',
      'birthDate',
      'emergencyContact'
    ]

    const compareFieldValues = (newVal: any, oldVal: any): boolean => {
      const format = (v: any) => String(v || t('value-na'))
      return format(newVal) !== format(oldVal)
    }

    return fields.reduce((count, field) => {
      return compareFieldValues(newRelationship[field], oldRelationship[field]) ? count + 1 : count
    }, 0)
  }, [newRelationship, oldRelationship, hasOldRelationship, t])

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
      console.error('Error acknowledging relationship change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="change-relationship-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="change-relationship-review-error">
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

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return t('value-na')
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Field comparison
  interface FieldComparison {
    changed: boolean
    oldValue: string
    newValue: string
  }

  const compareField = (newVal: any, oldVal: any, formatter?: (val: any) => string): FieldComparison => {
    const format = formatter || ((v: any) => String(v || t('value-na')))
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

  const relationshipName =
    `${newRelationship.firstName || ''} ${newRelationship.lastName || ''}`.trim() || 'Relationship'

  // Render comparison field - Show changed fields OR all fields with values in insert mode
  const renderComparisonField = (label: string, comparison: FieldComparison, icon?: React.ReactNode) => {
    const isNewRelationship = !hasOldRelationship || isInsertMode

    // For insert mode: show all fields that have a value
    // For update mode: only show changed fields
    if (isNewRelationship) {
      // Skip empty values in insert mode
      if (!comparison.newValue || comparison.newValue === t('value-na')) return null
    } else {
      // Only show changed fields in update mode
      if (!comparison.changed) return null
    }

    // Display "Not set" if old value was empty/null/N/A
    const displayOldValue =
      comparison.oldValue === t('value-na') || !comparison.oldValue ? t('value-not-set') : comparison.oldValue

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          <Badge variant={isNewRelationship ? 'success' : 'warning'} className="gba:ml-2">
            {isNewRelationship ? t('badge-new') : t('badge-changed')}
          </Badge>
        </Label>

        {/* Always show old → new for changed fields */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {!isNewRelationship && (
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
    if (!value || value === t('value-na')) return null

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
      data-testid="change-relationship-review-container"
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
            data-testid="change-relationship-review-actions"
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
      <Alert variant="default">
        <FileText className="gba:h-4 gba:w-4" />
        <AlertDescription>
          {isInsertMode
            ? t('alert-new-relationship', { name: relationshipName })
            : hasOldRelationship && changesCount > 0
              ? t('alert-update-with-changes', { count: changesCount })
              : t('alert-update-no-changes')}
        </AlertDescription>
      </Alert>

      {/* Relationship Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Users className="gba:h-5 gba:w-5" />
              {isInsertMode ? t('card-title-new-relationship') : t('card-title-changes')}
            </CardTitle>
            {hasOldRelationship && changesCount > 0 && (
              <Badge variant="warning">{t('badge-changes', { count: changesCount })}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Personal Information */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              t('label-first-name'),
              compareField(newRelationship.firstName, oldRelationship.firstName),
              <User className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-last-name'),
              compareField(newRelationship.lastName, oldRelationship.lastName),
              <User className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              t('label-phone-number'),
              compareField(newRelationship.phoneNumber, oldRelationship.phoneNumber),
              <Phone className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-email'),
              compareField(newRelationship.email, oldRelationship.email),
              <Mail className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Relationship Details */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              t('label-relationship-type'),
              compareField(newRelationship.typeRef, oldRelationship.typeRef, getCatalogValue),
              <Users className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-birth-date'),
              compareField(newRelationship.birthDate, oldRelationship.birthDate, formatDate),
              <Calendar className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Emergency Contact */}
          {renderComparisonField(
            t('label-emergency-contact'),
            compareField(
              String(newRelationship.emergencyContact || false),
              String(oldRelationship.emergencyContact || false)
            ),
            <Shield className="gba:h-4 gba:w-4" />
          )}

          {/* Notes - only show if present */}
          {(newRelationship.notes || oldRelationship.notes) && (
            <>
              <Separator />
              {renderComparisonField(t('label-notes'), compareField(newRelationship.notes, oldRelationship.notes))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Unchanged Fields - Collapsible Section */}
      {!isInsertMode && hasOldRelationship && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <Users className="gba:h-5 gba:w-5" />
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
                {/* Personal Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.firstName, oldRelationship.firstName)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-first-name'),
                        comparison.newValue,
                        <User className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.lastName, oldRelationship.lastName)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-last-name'),
                        comparison.newValue,
                        <User className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.phoneNumber, oldRelationship.phoneNumber)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-phone-number'),
                        comparison.newValue,
                        <Phone className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.email, oldRelationship.email)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(t('label-email'), comparison.newValue, <Mail className="gba:h-4 gba:w-4" />)
                    )
                  })()}
                </div>

                <Separator />

                {/* Relationship Details */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.typeRef, oldRelationship.typeRef, getCatalogValue)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-relationship-type'),
                        comparison.newValue,
                        <Users className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.birthDate, oldRelationship.birthDate, formatDate)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-birth-date'),
                        comparison.newValue,
                        <Calendar className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Emergency Contact */}
                {(() => {
                  const comparison = compareField(
                    String(newRelationship.emergencyContact || false),
                    String(oldRelationship.emergencyContact || false)
                  )
                  return (
                    !comparison.changed &&
                    renderUnchangedField(
                      t('label-emergency-contact'),
                      comparison.newValue,
                      <Shield className="gba:h-4 gba:w-4" />
                    )
                  )
                })()}

                {/* Notes */}
                {(newRelationship.notes || oldRelationship.notes) &&
                  (() => {
                    const comparison = compareField(newRelationship.notes, oldRelationship.notes)
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

      {/* Not Set Fields - Collapsible Section for Insert Mode */}
      {isInsertMode && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <Users className="gba:h-5 gba:w-5" />
                    {t('card-title-unchanged')}
                    <Badge variant="secondary" className="gba:ml-2">
                      {t('badge-not-set')}
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
                {/* Contact Information - show if not set */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(!newRelationship.phoneNumber || newRelationship.phoneNumber === t('value-na')) &&
                    renderUnchangedField(
                      t('label-phone-number'),
                      t('value-not-set'),
                      <Phone className="gba:h-4 gba:w-4" />
                    )}

                  {(!newRelationship.email || newRelationship.email === t('value-na')) &&
                    renderUnchangedField(t('label-email'), t('value-not-set'), <Mail className="gba:h-4 gba:w-4" />)}
                </div>

                <Separator />

                {/* Emergency Contact - show if not set */}
                {!newRelationship.emergencyContact &&
                  renderUnchangedField(
                    t('label-emergency-contact'),
                    t('value-not-set'),
                    <Shield className="gba:h-4 gba:w-4" />
                  )}

                {/* Notes - show if not set */}
                {!newRelationship.notes && (
                  <>
                    <Separator />
                    {renderUnchangedField(t('label-notes'), t('value-not-set'))}
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

const ChangeRelationshipReview: React.FC<ChangeRelationshipReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing
  const fallbackAdditionalData = additionalData || {
    psi_taskPayload: {
      employeeRelationship: {},
      oldEmployeeRelationship: {}
    }
  }

  return (
    <div className="gba:h-full" data-testid="change-relationship-review-wrapper">
      <ChangeRelationshipReviewContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ChangeRelationshipReview
