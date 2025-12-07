/**
 * ChangePersonalDataReview Component
 * Modern form for reviewing personal data change requests from Kogito processes
 * Uses TaskDetailHeader and TaskDetailFooter for consistent HR form layout
 */

import React, { useState, useMemo } from 'react'
import {
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Label,
  Spinner,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  useTranslation
} from '@newwork/nw-design-system'
import {
  User,
  Calendar,
  MapPin,
  Globe,
  Heart,
  GraduationCap,
  ChevronDown,
  CheckCircle,
  FileText,
  ArrowRight
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { usePersonalDataReviewData } from './hooks/usePersonalDataReviewData'
import translations from './_i18n'
import dayjs from 'dayjs'

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

interface ChangePersonalDataReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface PersonalInformationData {
  salutationRef?: string | null
  title?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  preferredName?: string | null
  birthName?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  genderRef?: string | null
  nationalityRef?: string | null
  languageRef?: string | null
  maritalStatusRef?: string | null
  severelyDisabilityDegree?: number | null
  schoolQualificationRef?: string | null
  notes?: string | null
  id?: string | null
}

const ChangePersonalDataReviewContent: React.FC<ChangePersonalDataReviewProps> = ({
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

  // Extract personal information data from payload
  const newPersonalInformation: PersonalInformationData = taskPayload?.personalInformation || {}
  const oldPersonalInformation: PersonalInformationData = taskPayload?.oldPersonalInformation || {}
  const employeeIdFromPayload: string | undefined =
    taskPayload?.personalInformation?.id || userInfo?.employeeDetails?.employeeId

  // Fetch employee and catalog data
  const { employeeData, catalogMap, loading, error, refetch } = usePersonalDataReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    newPersonalInformation,
    oldPersonalInformation
  })

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Helper: check if old personal information exists
  const hasOldPersonalInformation = Boolean(
    oldPersonalInformation?.firstName || oldPersonalInformation?.lastName || oldPersonalInformation?.birthDate
  )

  const changeMode = hasOldPersonalInformation ? 'UPDATE' : 'INSERT'
  const isInsertMode = changeMode === 'INSERT'

  // Helper function to get alert description message (extracted to reduce nested ternaries)
  const getAlertDescriptionMessage = (mode: string, hasOld: boolean, changes: number): string => {
    if (mode === 'INSERT') {
      return t('alert-new-data')
    }
    if (hasOld && changes > 0) {
      return t('alert-update-with-changes', { count: changes })
    }
    return t('alert-update-no-changes')
  }

  // Count total changes - MUST BE BEFORE CONDITIONAL RETURNS
  const changesCount = useMemo(() => {
    if (!hasOldPersonalInformation) return 0

    const fields: (keyof PersonalInformationData)[] = [
      'salutationRef',
      'title',
      'firstName',
      'lastName',
      'displayName',
      'preferredName',
      'birthName',
      'birthDate',
      'birthPlace',
      'genderRef',
      'nationalityRef',
      'languageRef',
      'maritalStatusRef',
      'severelyDisabilityDegree',
      'schoolQualificationRef'
    ]

    const compareFieldValues = (newVal: any, oldVal: any): boolean => {
      const format = (v: any) => String(v || t('value-na'))
      return format(newVal) !== format(oldVal)
    }

    return fields.reduce((count, field) => {
      return compareFieldValues(newPersonalInformation[field], oldPersonalInformation[field]) ? count + 1 : count
    }, 0)
  }, [newPersonalInformation, oldPersonalInformation, hasOldPersonalInformation, t])

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
      console.error('Error acknowledging personal data change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="change-personal-data-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="change-personal-data-review-error">
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

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

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

  // Render comparison field - Show ONLY changed fields with old → new
  const renderComparisonField = (label: string, comparison: FieldComparison, icon?: React.ReactNode) => {
    // Only show changed fields
    if (!comparison.changed) return null

    const isNewData = !hasOldPersonalInformation || changeMode === 'INSERT'
    // Display "Not set" if old value was empty/null/N/A
    const displayOldValue =
      comparison.oldValue === t('value-na') || !comparison.oldValue ? t('value-not-set') : comparison.oldValue

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          <Badge variant={isNewData ? 'success' : 'warning'} className="gba:ml-2">
            {isNewData ? t('badge-new') : t('badge-changed')}
          </Badge>
        </Label>

        {/* Always show old → new for changed fields */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {!isNewData && (
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
      data-testid="change-personal-data-review-container"
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
                  position: employeeData.position
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
            data-testid="change-personal-data-review-actions"
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
          {getAlertDescriptionMessage(changeMode, hasOldPersonalInformation, changesCount)}
        </AlertDescription>
      </Alert>

      {/* Personal Data Comparison Card */}
      <div className="gba:bg-card gba:rounded-lg gba:border gba:border-border">
        <div className="gba:p-6 gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h4 className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold">
              <User className="gba:h-5 gba:w-5" />
              {changeMode === 'INSERT' ? t('card-title-new-data') : t('card-title-changes')}
            </h4>
            {hasOldPersonalInformation && changesCount > 0 && (
              <Badge variant="warning">{t('badge-changes', { count: changesCount })}</Badge>
            )}
          </div>
        </div>
        <div className="gba:p-6 gba:space-y-4">
          {/* Names Section */}
          <div className="gba:space-y-4">
            {renderComparisonField(
              t('label-salutation'),
              compareField(newPersonalInformation.salutationRef, oldPersonalInformation.salutationRef, getCatalogValue)
            )}
            {renderComparisonField(
              t('label-title'),
              compareField(newPersonalInformation.title, oldPersonalInformation.title)
            )}
            {renderComparisonField(
              t('label-first-name'),
              compareField(newPersonalInformation.firstName, oldPersonalInformation.firstName)
            )}
            {renderComparisonField(
              t('label-last-name'),
              compareField(newPersonalInformation.lastName, oldPersonalInformation.lastName)
            )}
            {renderComparisonField(
              t('label-display-name'),
              compareField(newPersonalInformation.displayName, oldPersonalInformation.displayName)
            )}
            {renderComparisonField(
              t('label-preferred-name'),
              compareField(newPersonalInformation.preferredName, oldPersonalInformation.preferredName)
            )}
            {renderComparisonField(
              t('label-birth-name'),
              compareField(newPersonalInformation.birthName, oldPersonalInformation.birthName)
            )}
          </div>

          <Separator />

          {/* Birth and Gender Section */}
          <div className="gba:space-y-4">
            {renderComparisonField(
              t('label-birth-date'),
              compareField(newPersonalInformation.birthDate, oldPersonalInformation.birthDate, date =>
                date ? dayjs(date).format('MMM D, YYYY') : t('value-na')
              ),
              <Calendar className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-birth-place'),
              compareField(newPersonalInformation.birthPlace, oldPersonalInformation.birthPlace),
              <MapPin className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-gender'),
              compareField(newPersonalInformation.genderRef, oldPersonalInformation.genderRef, getCatalogValue),
              <User className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="gba:space-y-4">
            {renderComparisonField(
              t('label-nationality'),
              compareField(
                newPersonalInformation.nationalityRef,
                oldPersonalInformation.nationalityRef,
                getCatalogValue
              ),
              <Globe className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-language'),
              compareField(newPersonalInformation.languageRef, oldPersonalInformation.languageRef, getCatalogValue),
              <Globe className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-marital-status'),
              compareField(
                newPersonalInformation.maritalStatusRef,
                oldPersonalInformation.maritalStatusRef,
                getCatalogValue
              ),
              <Heart className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              t('label-disability-degree'),
              compareField(
                newPersonalInformation.severelyDisabilityDegree,
                oldPersonalInformation.severelyDisabilityDegree
              )
            )}
            {renderComparisonField(
              t('label-school-qualification'),
              compareField(
                newPersonalInformation.schoolQualificationRef,
                oldPersonalInformation.schoolQualificationRef,
                getCatalogValue
              ),
              <GraduationCap className="gba:h-4 gba:w-4" />
            )}
          </div>

          {/* Notes - only show if present */}
          {(newPersonalInformation.notes || oldPersonalInformation.notes) && (
            <>
              <Separator />
              {renderComparisonField(
                t('label-notes'),
                compareField(newPersonalInformation.notes, oldPersonalInformation.notes)
              )}
            </>
          )}
        </div>
      </div>

      {/* Unchanged Fields - Collapsible Section */}
      {!isInsertMode && hasOldPersonalInformation && (
        <div className="gba:bg-card gba:rounded-lg gba:border gba:border-border">
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <div className="gba:p-6 gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors gba:border-b gba:border-border">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <h4 className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold">
                    <User className="gba:h-5 gba:w-5" />
                    {t('card-title-unchanged')}
                    <Badge variant="secondary" className="gba:ml-2">
                      {t('badge-unchanged')}
                    </Badge>
                  </h4>
                  <ChevronDown
                    className={`gba:h-5 gba:w-5 gba:transition-transform ${
                      isUnchangedExpanded ? 'gba:rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="gba:p-6 gba:space-y-4">
                {/* Names Section */}
                <div className="gba:space-y-4">
                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.salutationRef,
                      oldPersonalInformation.salutationRef,
                      getCatalogValue
                    )
                    return !comparison.changed && renderUnchangedField(t('label-salutation'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(newPersonalInformation.title, oldPersonalInformation.title)
                    return !comparison.changed && renderUnchangedField(t('label-title'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(newPersonalInformation.firstName, oldPersonalInformation.firstName)
                    return !comparison.changed && renderUnchangedField(t('label-first-name'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(newPersonalInformation.lastName, oldPersonalInformation.lastName)
                    return !comparison.changed && renderUnchangedField(t('label-last-name'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.displayName,
                      oldPersonalInformation.displayName
                    )
                    return !comparison.changed && renderUnchangedField(t('label-display-name'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.preferredName,
                      oldPersonalInformation.preferredName
                    )
                    return !comparison.changed && renderUnchangedField(t('label-preferred-name'), comparison.newValue)
                  })()}

                  {(() => {
                    const comparison = compareField(newPersonalInformation.birthName, oldPersonalInformation.birthName)
                    return !comparison.changed && renderUnchangedField(t('label-birth-name'), comparison.newValue)
                  })()}
                </div>

                <Separator />

                {/* Birth and Gender Section */}
                <div className="gba:space-y-4">
                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.birthDate,
                      oldPersonalInformation.birthDate,
                      date => (date ? dayjs(date).format('MMM D, YYYY') : t('value-na'))
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-birth-date'),
                        comparison.newValue,
                        <Calendar className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.birthPlace,
                      oldPersonalInformation.birthPlace
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-birth-place'),
                        comparison.newValue,
                        <MapPin className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.genderRef,
                      oldPersonalInformation.genderRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(t('label-gender'), comparison.newValue, <User className="gba:h-4 gba:w-4" />)
                    )
                  })()}
                </div>

                <Separator />

                {/* Additional Information */}
                <div className="gba:space-y-4">
                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.nationalityRef,
                      oldPersonalInformation.nationalityRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-nationality'),
                        comparison.newValue,
                        <Globe className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.languageRef,
                      oldPersonalInformation.languageRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-language'),
                        comparison.newValue,
                        <Globe className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.maritalStatusRef,
                      oldPersonalInformation.maritalStatusRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-marital-status'),
                        comparison.newValue,
                        <Heart className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.severelyDisabilityDegree,
                      oldPersonalInformation.severelyDisabilityDegree
                    )
                    return (
                      !comparison.changed && renderUnchangedField(t('label-disability-degree'), comparison.newValue)
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(
                      newPersonalInformation.schoolQualificationRef,
                      oldPersonalInformation.schoolQualificationRef,
                      getCatalogValue
                    )
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        t('label-school-qualification'),
                        comparison.newValue,
                        <GraduationCap className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}
                </div>

                {/* Notes */}
                {(newPersonalInformation.notes || oldPersonalInformation.notes) &&
                  (() => {
                    const comparison = compareField(newPersonalInformation.notes, oldPersonalInformation.notes)
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </TaskFormLayout>
  )
}

const ChangePersonalDataReview: React.FC<ChangePersonalDataReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing
  const fallbackAdditionalData = additionalData || {
    psi_taskPayload: {
      personalInformation: {},
      oldPersonalInformation: {}
    }
  }

  return (
    <div className="gba:h-full" data-testid="change-personal-data-review-wrapper">
      <ChangePersonalDataReviewContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ChangePersonalDataReview
