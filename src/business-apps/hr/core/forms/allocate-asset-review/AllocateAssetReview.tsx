/**
 * Allocate Asset Review – employee acknowledges an asset allocation.
 * Submits payload { acknowledge: "acknowledged" } via process continue event.
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { Package, Calendar, FileText, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useAllocateAssetReviewData } from './hooks/useAllocateAssetReviewData'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import translations from './_i18n'

interface AllocateAssetReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

function formatDate(dateStr: string | undefined, locale?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

const AllocateAssetReviewContent: React.FC<AllocateAssetReviewProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  const { t, locale } = useTranslation(translations)
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  const taskPayload = additionalData?.psi_taskPayload ?? {}
  const taskStatus = additionalData?.psi_taskStatus ?? (additionalData?.psi_processMetadata as any)?.status
  const isTaskCompleted = taskStatus === 'COMPLETED'
  const taskTitle = t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  const { allocation, asset, assetDisplayName, loading, error, refetch } = useAllocateAssetReviewData(
    { accessToken, additionalData, userInfo },
    additionalData
  )

  const isEveryBoxContext = !!onClose

  const handleClose = () => {
    if (onClose) onClose()
    else dispatchProcessContinueEvent('pse_abort', { event: 'pse_abort' })
  }

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        acknowledge: 'acknowledged'
      })
    } catch (err) {
      console.error('Error acknowledging allocation:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="allocate-asset-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allocate-asset-review-error">
        <AlertTitle>{t('error-loading-title')}</AlertTitle>
        <AlertDescription>
          {error}
          <button
            type="button"
            onClick={() => refetch()}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            {t('action-retry')}
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  const employeeDisplayName =
    allocation?.employee?.displayName ||
    [allocation?.employee?.firstName, allocation?.employee?.lastName].filter(Boolean).join(' ') ||
    '—'
  const conditionLabel = allocation?.startAssetCondition?.value ?? allocation?.startAssetConditionRef ?? '—'

  const content = (
    <>
      <Alert variant="default" className="gba:mb-4">
        <FileText className="gba:h-4 gba:w-4" />
        <AlertDescription>{t('alert-description')}</AlertDescription>
      </Alert>

      <Card data-testid="allocate-asset-review-details-card">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
            <Package className="gba:h-5 gba:w-5" />
            {t('card-title-allocation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-asset')}</p>
              <p className="gba:text-foreground gba:font-medium" data-testid="allocate-asset-review-asset-name">
                {assetDisplayName}
              </p>
              {asset?.serialNumber && (
                <>
                  <p className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mt-2">{t('label-serial')}</p>
                  <p className="gba:text-foreground gba:font-medium" data-testid="allocate-asset-review-serial">
                    {asset.serialNumber}
                  </p>
                </>
              )}
            </div>
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-allocated-to')}</p>
              <p className="gba:text-foreground gba:font-medium" data-testid="allocate-asset-review-employee">
                {employeeDisplayName}
              </p>
            </div>
          </div>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-start-date')}</p>
                <p className="gba:text-foreground gba:font-medium" data-testid="allocate-asset-review-start-date">
                  {formatDate(allocation?.startDate, locale)}
                </p>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-expected-end-date')}</p>
                <p
                  className="gba:text-foreground gba:font-medium"
                  data-testid="allocate-asset-review-expected-end-date"
                >
                  {allocation?.expectedEndDate ? formatDate(allocation.expectedEndDate, locale) : '—'}
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-condition')}</p>
            <p className="gba:text-foreground gba:font-medium" data-testid="allocate-asset-review-condition">
              {conditionLabel}
            </p>
          </div>
          {allocation?.notes && (
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('label-notes')}</p>
              <p
                className="gba:text-foreground gba:font-medium gba:whitespace-pre-wrap"
                data-testid="allocate-asset-review-notes"
              >
                {allocation.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )

  if (isEveryBoxContext) {
    return (
      <TaskFormLayout
        data-testid="allocate-asset-review-container"
        header={
          <TaskDetailHeader
            title={taskTitle}
            showEmployeeInfo={true}
            employeeData={
              userInfo?.employeeDetails
                ? {
                    displayName:
                      userInfo.employeeDetails.displayName ||
                      `${userInfo.employeeDetails.firstName ?? ''} ${userInfo.employeeDetails.lastName ?? ''}`.trim(),
                    firstName: userInfo.employeeDetails.firstName,
                    lastName: userInfo.employeeDetails.lastName,
                    avatarUrl: userInfo.employeeDetails.pictureThumbnail
                      ? `data:image/jpeg;base64,${userInfo.employeeDetails.pictureThumbnail}`
                      : undefined,
                    position: userInfo.employeeDetails.jobTitle
                  }
                : undefined
            }
            isLoadingEmployee={false}
            creatorName={creatorName}
            onClose={handleClose}
          />
        }
        footer={
          !isTaskCompleted ? (
            <TaskDetailFooter
              data-testid="allocate-asset-review-actions"
              actions={[
                {
                  label: t('action-acknowledge'),
                  onClick: handleAcknowledge,
                  variant: 'default' as const,
                  disabled: isAcknowledging,
                  loading: isAcknowledging,
                  icon: CheckCircle,
                  className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                  testId: 'allocate-asset-review-acknowledge-button'
                }
              ]}
            />
          ) : undefined
        }
        contentClassName="gba:space-y-4"
      >
        {content}
      </TaskFormLayout>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="allocate-asset-review-container"
    >
      <FormHeader title={taskTitle} flowIconUrl={flowIconUrl} className="gba:px-6" />
      <div className="gba:px-6 gba:pb-6 gba:space-y-4">
        {content}
        {!isTaskCompleted && (
          <div className="gba:flex gba:justify-end gba:pt-4">
            <Button
              variant="default"
              className="gba:bg-success gba:text-success-foreground hover:gba:bg-success/90"
              disabled={isAcknowledging}
              onClick={handleAcknowledge}
              data-testid="allocate-asset-review-acknowledge-button"
            >
              <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
              {t('action-acknowledge')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const AllocateAssetReview: React.FC<AllocateAssetReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props
  return (
    <div className="gba:h-full" data-testid="allocate-asset-review-wrapper">
      <AllocateAssetReviewContent
        accessToken={accessToken}
        additionalData={additionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default AllocateAssetReview
export { AllocateAssetReview }
