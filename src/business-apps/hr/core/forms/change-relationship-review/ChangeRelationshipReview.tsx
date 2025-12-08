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
import { Users, CheckCircle, User, Phone, Mail, Calendar, FileText, Shield, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useRelationshipReviewData } from './hooks/useRelationshipReviewData'
import { useReviewFormData, RenderComparisonField, RenderUnchangedField } from '../shared'
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

  // Helper functions for formatters
  const getCatalogValue = (ref?: string | null): string => {
    if (!ref) return t('value-na')
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }

  const formatEmergencyContact = (isEmergency?: boolean | null): string => {
    if (isEmergency === true) return t('value-yes')
    if (isEmergency === false) return t('value-no')
    return t('value-na')
  }

  const formatBirthDate = (date?: string | null): string => {
    if (!date) return t('value-na')
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return String(date)
    }
  }

  // Use shared hook for review form data
  const { changesCount, isInsertMode, compareField } = useReviewFormData<EmployeeRelationshipData>({
    newData: newRelationship,
    oldData: oldRelationship,
    fields: [
      'firstName',
      'lastName',
      'phoneNumber',
      'email',
      'notes',
      'typeRef',
      'birthDate',
      'emergencyContact',
      'relationshipDocument'
    ],
    formatters: {
      typeRef: getCatalogValue,
      birthDate: formatBirthDate,
      emergencyContact: formatEmergencyContact
    },
    defaultFormatter: (v: any) => String(v || t('value-na')),
    t
  })

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

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

  const relationshipName =
    `${newRelationship.firstName || ''} ${newRelationship.lastName || ''}`.trim() || 'Relationship'

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
            <RenderComparisonField
              label={t('label-first-name')}
              comparison={compareField('firstName')}
              icon={<User className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-last-name')}
              comparison={compareField('lastName')}
              icon={<User className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <RenderComparisonField
              label={t('label-phone-number')}
              comparison={compareField('phoneNumber')}
              icon={<Phone className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-email')}
              comparison={compareField('email')}
              icon={<Mail className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          <Separator />

          {/* Relationship Details */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <RenderComparisonField
              label={t('label-relationship-type')}
              comparison={compareField('typeRef')}
              icon={<Users className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-birth-date')}
              comparison={compareField('birthDate')}
              icon={<Calendar className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          <Separator />

          {/* Emergency Contact */}
          <RenderComparisonField
            label={t('label-emergency-contact')}
            comparison={compareField('emergencyContact')}
            icon={<Shield className="gba:h-4 gba:w-4" />}
            isNewData={isInsertMode}
            t={t}
          />

          {/* Notes - only show if present */}
          {(newRelationship.notes || oldRelationship.notes) && (
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
                    const comparison = compareField('firstName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-first-name')}
                          value={comparison.newValue}
                          icon={<User className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('lastName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-last-name')}
                          value={comparison.newValue}
                          icon={<User className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField('phoneNumber')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-phone-number')}
                          value={comparison.newValue}
                          icon={<Phone className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('email')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-email')}
                          value={comparison.newValue}
                          icon={<Mail className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Relationship Details */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField('typeRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-relationship-type')}
                          value={comparison.newValue}
                          icon={<Users className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('birthDate')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-birth-date')}
                          value={comparison.newValue}
                          icon={<Calendar className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Emergency Contact */}
                {(() => {
                  const comparison = compareField('emergencyContact')
                  return (
                    !comparison.changed && (
                      <RenderUnchangedField
                        label={t('label-emergency-contact')}
                        value={comparison.newValue}
                        icon={<Shield className="gba:h-4 gba:w-4" />}
                        t={t}
                      />
                    )
                  )
                })()}

                {/* Notes */}
                {(newRelationship.notes || oldRelationship.notes) &&
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
                  {!newRelationship.phoneNumber && (
                    <RenderUnchangedField
                      label={t('label-phone-number')}
                      value={t('value-not-set')}
                      icon={<Phone className="gba:h-4 gba:w-4" />}
                      t={t}
                    />
                  )}

                  {!newRelationship.email && (
                    <RenderUnchangedField
                      label={t('label-email')}
                      value={t('value-not-set')}
                      icon={<Mail className="gba:h-4 gba:w-4" />}
                      t={t}
                    />
                  )}
                </div>

                <Separator />

                {/* Emergency Contact - show if not set */}
                {newRelationship.emergencyContact == null && (
                  <RenderUnchangedField
                    label={t('label-emergency-contact')}
                    value={t('value-not-set')}
                    icon={<Shield className="gba:h-4 gba:w-4" />}
                    t={t}
                  />
                )}

                {/* Notes - show if not set */}
                {!newRelationship.notes && (
                  <>
                    <Separator />
                    <RenderUnchangedField label={t('label-notes')} value={t('value-not-set')} t={t} />
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
