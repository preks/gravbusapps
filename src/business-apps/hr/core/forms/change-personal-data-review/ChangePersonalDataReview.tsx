/**
 * ChangePersonalDataReview Component
 * Modern form for reviewing personal data change requests from Kogito processes
 * Uses TaskDetailHeader and TaskDetailFooter for consistent HR form layout
 */

import React, { useState } from 'react'
import {
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Spinner,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  useTranslation
} from '@newwork/nw-design-system'
import { User, Calendar, MapPin, Globe, Heart, GraduationCap, ChevronDown, CheckCircle, FileText } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { usePersonalDataReviewData } from './hooks/usePersonalDataReviewData'
import { useReviewFormData } from '../../hooks/useReviewFormData'
import { RenderComparisonField, RenderUnchangedField } from '../../components/ReviewFieldRenderer'
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

  // Helper functions for formatters
  const getCatalogValue = (ref?: string | null): string => {
    if (!ref) return t('value-na')
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }

  const formatBirthDate = (date?: string | null): string => {
    if (!date) return t('value-na')
    return dayjs(date).format('MMM D, YYYY')
  }

  // Use shared hook for review form data
  const { changesCount, changeMode, isInsertMode, compareField } = useReviewFormData<PersonalInformationData>({
    newData: newPersonalInformation,
    oldData: oldPersonalInformation,
    fields: [
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
      'schoolQualificationRef',
      'notes'
    ],
    formatters: {
      salutationRef: getCatalogValue,
      genderRef: getCatalogValue,
      nationalityRef: getCatalogValue,
      languageRef: getCatalogValue,
      maritalStatusRef: getCatalogValue,
      schoolQualificationRef: getCatalogValue,
      birthDate: formatBirthDate
    },
    defaultFormatter: (v: any) => String(v || t('value-na')),
    t
  })

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

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

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
            <RenderComparisonField
              label={t('label-salutation')}
              comparison={compareField('salutationRef')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-title')}
              comparison={compareField('title')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-first-name')}
              comparison={compareField('firstName')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-last-name')}
              comparison={compareField('lastName')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-display-name')}
              comparison={compareField('displayName')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-preferred-name')}
              comparison={compareField('preferredName')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-birth-name')}
              comparison={compareField('birthName')}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          <Separator />

          {/* Birth and Gender Section */}
          <div className="gba:space-y-4">
            <RenderComparisonField
              label={t('label-birth-date')}
              comparison={compareField('birthDate')}
              icon={<Calendar className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-birth-place')}
              comparison={compareField('birthPlace')}
              icon={<MapPin className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-gender')}
              comparison={compareField('genderRef')}
              icon={<User className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="gba:space-y-4">
            <RenderComparisonField
              label={t('label-nationality')}
              comparison={compareField('nationalityRef')}
              icon={<Globe className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-language')}
              comparison={compareField('languageRef')}
              icon={<Globe className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-marital-status')}
              comparison={compareField('maritalStatusRef')}
              icon={<Heart className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-disability-degree')}
              comparison={compareField('severelyDisabilityDegree')}
              isNewData={isInsertMode}
              t={t}
            />
            <RenderComparisonField
              label={t('label-school-qualification')}
              comparison={compareField('schoolQualificationRef')}
              icon={<GraduationCap className="gba:h-4 gba:w-4" />}
              isNewData={isInsertMode}
              t={t}
            />
          </div>

          {/* Notes - only show if present */}
          {(newPersonalInformation.notes || oldPersonalInformation.notes) && (
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
                    const comparison = compareField('salutationRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-salutation')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('title')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-title')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('firstName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-first-name')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('lastName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-last-name')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('displayName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-display-name')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('preferredName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-preferred-name')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('birthName')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-birth-name')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Birth and Gender Section */}
                <div className="gba:space-y-4">
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

                  {(() => {
                    const comparison = compareField('birthPlace')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-birth-place')}
                          value={comparison.newValue}
                          icon={<MapPin className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('genderRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-gender')}
                          value={comparison.newValue}
                          icon={<User className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}
                </div>

                <Separator />

                {/* Additional Information */}
                <div className="gba:space-y-4">
                  {(() => {
                    const comparison = compareField('nationalityRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-nationality')}
                          value={comparison.newValue}
                          icon={<Globe className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('languageRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-language')}
                          value={comparison.newValue}
                          icon={<Globe className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('maritalStatusRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-marital-status')}
                          value={comparison.newValue}
                          icon={<Heart className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('severelyDisabilityDegree')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField label={t('label-disability-degree')} value={comparison.newValue} t={t} />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField('schoolQualificationRef')
                    return (
                      !comparison.changed && (
                        <RenderUnchangedField
                          label={t('label-school-qualification')}
                          value={comparison.newValue}
                          icon={<GraduationCap className="gba:h-4 gba:w-4" />}
                          t={t}
                        />
                      )
                    )
                  })()}
                </div>

                {/* Notes */}
                {(newPersonalInformation.notes || oldPersonalInformation.notes) &&
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
